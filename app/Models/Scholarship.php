<?php

namespace App\Models;

use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;

class Scholarship extends Model
{
    use Auditable;

    protected $fillable = [
        'student_id', 'student_name', 'cnic',
        'scheme', 'category', 'academic_year', 'donor', 'funding_group',
        'approved_amount', 'cheque_no', 'received_date',
        'payment_status', 'renewal_status', 'notes',
    ];

    protected $casts = [
        'approved_amount' => 'decimal:2',
        'received_date'   => 'date',
    ];

    // ---------------------------------------------------------------
    // Relationships
    // ---------------------------------------------------------------
    public function installments()
    {
        return $this->hasMany(Installment::class)->orderBy('installment_no');
    }

    // ---------------------------------------------------------------
    // Accessors
    // ---------------------------------------------------------------

    /** Total amount actually received across all installments. */
    public function getReceivedAmountAttribute(): float
    {
        return (float) $this->installments()
            ->where('status', 'received')
            ->sum('amount');
    }

    /** Number of installments that have been paid. */
    public function getPaidCountAttribute(): int
    {
        return $this->installments()->where('status', 'received')->count();
    }

    /** Total number of installments defined. */
    public function getInstallmentCountAttribute(): int
    {
        return $this->installments()->count();
    }

    /** Remaining amount (approved - received). */
    public function getOutstandingAmountAttribute(): float
    {
        return max(0, (float) $this->approved_amount - $this->received_amount);
    }

    // ---------------------------------------------------------------
    // Status derivation — call after any installment changes
    // ---------------------------------------------------------------
    public function syncPaymentStatus(): void
    {
        $received = $this->installments()->where('status', 'received')->sum('amount');
        $failed   = $this->installments()->where('status', 'failed')->count();
        $total    = $this->installments()->count();

        $approved = (float) $this->approved_amount;

        $status = 'pending';

        if ($total === 0) {
            // Legacy record with no installments — check old fields
            if ($this->cheque_no && $this->received_date) $status = 'paid';
            elseif ($this->cheque_no)                    $status = 'partial';
            elseif ($failed > 0)                          $status = 'failed';
        } elseif ($received >= $approved && $approved > 0) {
            $status = 'paid';
        } elseif ($received > 0) {
            $status = 'partial';
        } elseif ($failed > 0 && $failed === $total) {
            $status = 'failed';
        } else {
            $status = 'pending';
        }

        if ($this->payment_status !== $status) {
            $this->payment_status = $status;
            $this->saveQuietly(); // don't fire the Auditable trait noise
        }
    }
}
