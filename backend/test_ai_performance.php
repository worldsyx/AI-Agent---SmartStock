<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\V1\AiPerformanceController;

echo "=== TESTING AI PERFORMANCE EVALUATION CONTROLLER ===\n";

$controller = new AiPerformanceController();
$manager = User::where('email', 'manager@smartstock.id')->first();

// 1. Test Overview
$resp = $controller->getOverview();
$data = json_decode($resp->getContent(), true);
echo "1. Overview: Overall Accuracy = " . $data['data']['overall_accuracy'] . "%, Total Processed = " . $data['data']['total_processed_data'] . "\n";
assert(isset($data['data']['overall_accuracy']), "Overall accuracy must be present");
assert(isset($data['data']['pending_evaluation']), "Pending evaluation must be present");

// 2. Test Statistics
$resp = $controller->getStatistics();
$data = json_decode($resp->getContent(), true);
echo "2. Statistics: Total Received = " . $data['data']['total_received'] . ", Success Rate = " . $data['data']['success_rate'] . "%\n";
assert(isset($data['data']['passed_validation']), "Passed validation must be present");

// 3. Test Models
$resp = $controller->getModels();
$data = json_decode($resp->getContent(), true);
echo "3. Models: Count = " . count($data['data']) . " models\n";
foreach ($data['data'] as $m) {
    echo "   - " . $m['model_name'] . " (" . $m['model_version'] . "): Acc " . $m['accuracy'] . "%\n";
    assert(isset($m['metrics']), "Metrics must be present");
}

// 4. Test Trends
$req = Request::create('/manager/ai-performance/trends?period=monthly', 'GET');
$resp = $controller->getTrends($req);
$data = json_decode($resp->getContent(), true);
echo "4. Trends (Monthly): " . count($data['data']) . " data points\n";
assert(count($data['data']) > 0, "Trend points must be generated");

// 5. Test Error Analysis
$resp = $controller->getErrorAnalysis();
$data = json_decode($resp->getContent(), true);
echo "5. Error Analysis: Total Errors = " . $data['data']['total_errors'] . ", Types = " . count($data['data']['error_types']) . "\n";

// 6. Test History
$req = Request::create('/manager/ai-performance/history', 'GET');
$resp = $controller->getHistory($req);
$data = json_decode($resp->getContent(), true);
echo "6. History: " . count($data['data']) . " runs recorded\n";
assert(count($data['data']) > 0, "History runs must be present");

// 7. Test Run (Custom / Preset 10 samples)
$model = App\Models\AiModel::first();
$req = Request::create('/manager/ai-performance/test-run', 'POST', [
    'model_id' => $model->id,
    'dataset_source' => 'preset_prd',
    'dataset_name' => 'Automated Test Run PRD 10 Samples',
]);
$req->setUserResolver(function () use ($manager) { return $manager; });
$resp = $controller->runTest($req);
$data = json_decode($resp->getContent(), true);
echo "7. Run Test Result: Status = " . $resp->getStatusCode() . ", Run ID = " . $data['data']['id'] . ", Accuracy = " . $data['data']['accuracy'] . "%, MAE = " . $data['data']['mae'] . ", MAPE = " . $data['data']['mape'] . "%\n";
assert($resp->getStatusCode() === 201, "Test run must return 201");

echo "\n>>> ALL BACKEND AI EVALUATION TESTS PASSED SUCCESSFULLY! <<<\n";
