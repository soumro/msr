<?php

namespace App\Console\Commands;

use App\Models\Scholarship;
use Illuminate\Console\Command;

class MigrateInstallments extends Command
{
    protected $signature = 'msr:migrate-installments';
    protected $description = 'Convert legacy cheque_no/received_date into installment #1';

    public function handle()
    {
        $count = 0;

        Scholarship::whereDoesntHave('installments')
            ->where(function ($q) {
                $q->whereNotNull('cheque_no')
                  ->orWhereNotNull('received_date')
                  ->orWhere('payment_status', 'paid');
            })
            ->chunk(100, function ($scholarships) use (&$count) {
                foreach ($scholarships as $s) {
                    $status = $s->cheque_no && $s->received_date ? 'received'
                            : ($s->payment_status === 'paid'     ? 'received'
                            : ($s->payment_status === 'failed'   ? 'failed'
                            : 'pending'));

                    $s->installments()->create([
                        'installment_no' => 1,
                        'amount'         => $s->approved_amount,
                        'cheque_no'      => $s->cheque_no,
                        'received_date'  => $s->received_date,
                        'status'         => $status,
                    ]);

                    $s->syncPaymentStatus();
                    $count++;
                }
            });

        $this->info("Migrated {$count} scholarship records into installments.");
        return 0;
    }
}
