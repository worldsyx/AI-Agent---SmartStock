<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Carbon\Carbon;
use App\Models\InventoryTransaction;
use App\Models\StocktakeSession;
use App\Models\AiFinding;
use App\Models\StorageLocation;

class OperatorController extends Controller
{
    /**
     * PRD 6.2: Beranda Operator (Mobile-First)
     */
    public function home(Request $request)
    {
        $user = $request->user();
        $todayStart = Carbon::today()->startOfDay();
        $todayEnd = Carbon::today()->endOfDay();

        // Transaksi operator hari ini
        $myReceiptsCount = InventoryTransaction::where('performed_by', $user->id)
            ->where('transaction_type', 'receipt')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        $myIssuesCount = InventoryTransaction::where('performed_by', $user->id)
            ->where('transaction_type', 'issue')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        $myTransfersCount = InventoryTransaction::where('performed_by', $user->id)
            ->where('transaction_type', 'transfer')
            ->whereBetween('created_at', [$todayStart, $todayEnd])
            ->count();

        // Tugas penghitungan atau stock opname yang sedang aktif
        $activeSessions = StocktakeSession::whereIn('status', ['draft', 'counting'])
            ->latest()
            ->take(3)
            ->get();

        // Rekomendasi slotting / penempatan AI aktif untuk panduan operator lapangan
        $slottingTips = AiFinding::where('agent_type', 'slotting')
            ->whereIn('status', ['new', 'approved'])
            ->latest()
            ->take(2)
            ->get();

        // 3 Transaksi terakhir saya
        $recentMyTransactions = InventoryTransaction::with(['product', 'fromLocation', 'toLocation', 'lot'])
            ->where('performed_by', $user->id)
            ->latest()
            ->take(3)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'operator' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role ? $user->role->name : 'operator',
                ],
                'today_stats' => [
                    'receipts_count' => $myReceiptsCount,
                    'issues_count' => $myIssuesCount,
                    'transfers_count' => $myTransfersCount,
                    'total_actions' => $myReceiptsCount + $myIssuesCount + $myTransfersCount,
                ],
                'active_tasks' => $activeSessions,
                'slotting_recommendations' => $slottingTips,
                'recent_transactions' => $recentMyTransactions,
                'timestamp' => now()->toIso8601String(),
            ]
        ]);
    }

    /**
     * PRD 6.8: Riwayat Transaksi Operator Sendiri
     */
    public function history(Request $request)
    {
        $user = $request->user();
        $query = InventoryTransaction::with(['product', 'lot', 'fromLocation', 'toLocation'])
            ->where('performed_by', $user->id);

        if ($type = $request->query('type')) {
            $query->where('transaction_type', $type);
        }

        $paginated = $query->latest()->paginate((int) $request->query('per_page', 15));

        return response()->json([
            'status' => 'success',
            'data' => $paginated->items(),
            'meta' => [
                'total' => $paginated->total(),
                'current_page' => $paginated->currentPage(),
                'per_page' => $paginated->perPage(),
            ]
        ]);
    }

    /**
     * PRD 6.2: Daftar Tugas Operator
     */
    public function tasks(Request $request)
    {
        $sessions = StocktakeSession::whereIn('status', ['draft', 'counting'])
            ->withCount('items')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $sessions
        ]);
    }
}
