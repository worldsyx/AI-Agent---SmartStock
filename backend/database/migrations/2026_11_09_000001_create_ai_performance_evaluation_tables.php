<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. ai_models
        if (!Schema::hasTable('ai_models')) {
            Schema::create('ai_models', function (Blueprint $table) {
                $table->id();
                $table->string('model_name')->unique();
                $table->string('model_type'); // prediction, anomaly_detection, recommendation, classification
                $table->string('model_version')->default('v1.0.0');
                $table->string('status')->default('active'); // active, deprecated, testing
                $table->text('description')->nullable();
                $table->timestamps();
            });
        }

        // 2. ai_model_versions
        if (!Schema::hasTable('ai_model_versions')) {
            Schema::create('ai_model_versions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('model_id')->constrained('ai_models')->cascadeOnDelete();
                $table->string('version');
                $table->text('change_description')->nullable();
                $table->date('deployment_date')->nullable();
                $table->string('status')->default('active'); // active, testing, archived
                $table->timestamps();
            });
        }

        // 3. ai_evaluation_runs
        if (!Schema::hasTable('ai_evaluation_runs')) {
            Schema::create('ai_evaluation_runs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('model_id')->constrained('ai_models')->cascadeOnDelete();
                $table->string('dataset_name');
                $table->string('test_type')->default('historical'); // historical, custom_sample, synthetic
                $table->integer('total_samples')->default(0);
                $table->integer('correct_results')->default(0);
                $table->integer('incorrect_results')->default(0);
                $table->integer('failed_results')->default(0);
                $table->integer('pending_results')->default(0);
                $table->decimal('accuracy', 8, 4)->nullable();
                $table->decimal('mae', 8, 4)->nullable();
                $table->decimal('mape', 8, 4)->nullable();
                $table->decimal('precision', 8, 4)->nullable();
                $table->decimal('recall', 8, 4)->nullable();
                $table->decimal('f1_score', 8, 4)->nullable();
                $table->decimal('processing_time', 8, 3)->nullable(); // seconds
                $table->timestamp('evaluation_date')->useCurrent();
                $table->foreignId('tested_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('status')->default('completed'); // completed, failed, pending
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->index(['model_id', 'evaluation_date']);
            });
        }

        // 4. ai_evaluation_details
        if (!Schema::hasTable('ai_evaluation_details')) {
            Schema::create('ai_evaluation_details', function (Blueprint $table) {
                $table->id();
                $table->foreignId('evaluation_run_id')->constrained('ai_evaluation_runs')->cascadeOnDelete();
                $table->string('sample_id');
                $table->json('input_data');
                $table->text('predicted_result');
                $table->text('actual_result')->nullable();
                $table->decimal('error_value', 12, 4)->nullable();
                $table->string('evaluation_status')->default('correct'); // correct, incorrect, pending, failed
                $table->string('notes')->nullable();
                $table->timestamps();

                $table->index(['evaluation_run_id', 'evaluation_status']);
            });
        }

        // 5. ai_processing_logs
        if (!Schema::hasTable('ai_processing_logs')) {
            Schema::create('ai_processing_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('model_id')->nullable()->constrained('ai_models')->nullOnDelete();
                $table->string('process_type'); // batch_prediction, realtime_analysis, validation, test_run
                $table->integer('input_count')->default(0);
                $table->integer('success_count')->default(0);
                $table->integer('failed_count')->default(0);
                $table->decimal('processing_duration', 8, 3)->default(0); // seconds
                $table->string('status')->default('success'); // success, warning, failed
                $table->text('error_message')->nullable();
                $table->timestamps();

                $table->index(['model_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_processing_logs');
        Schema::dropIfExists('ai_evaluation_details');
        Schema::dropIfExists('ai_evaluation_runs');
        Schema::dropIfExists('ai_model_versions');
        Schema::dropIfExists('ai_models');
    }
};
