<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ImportBatch;
use App\Models\Lookup;
use App\Models\Scholarship;
use App\Services\DuplicateAidDetector;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BulkImportController extends Controller
{
    private const COLUMNS = [
        'student_id', 'student_name', 'cnic',
        'scheme', 'category', 'academic_year', 'donor', 'funding_group',
        'approved_amount', 'cheque_no', 'received_date',
        'payment_status', 'renewal_status',
    ];

    // ---------------- Full 13-column template ----------------

    public function template()
    {
        $csv = implode(',', self::COLUMNS) . "\n";
        $csv .= "STU-1001,Ayesha Khan,35202-1234567-1,PMLTC,renewal,2025-2026,PMLTC,MUET Jamshoro,180000,PMLTC-R-001,2025-09-10,paid,approved\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="scholarship-import-template.csv"',
        ]);
    }

    public function validate(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt|max:10240']);
        $parsed = $this->parseCsv($request->file('file'));

        return response()->json([
            'columns' => $parsed['columns'],
            'rows'    => $parsed['rows'],
            'errors'  => $parsed['errors'],
            'total'   => count($parsed['rows']) + count($parsed['errors']),
            'valid'   => count($parsed['rows']),
        ]);
    }

    public function commit(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt|max:10240',
            'skip_invalid' => 'boolean',
        ]);

        $parsed = $this->parseCsv($request->file('file'));

        if (!empty($parsed['errors']) && !$request->boolean('skip_invalid')) {
            throw ValidationException::withMessages([
                'file' => ['File contains invalid rows. Enable skip_invalid or fix the CSV.'],
            ]);
        }

        $imported = 0;
        $skipped = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            $this->ensureLookups($parsed['rows']);

            foreach ($parsed['rows'] as $row) {
                $exists = Scholarship::where('student_id', $row['student_id'])
                    ->where('scheme', $row['scheme'])
                    ->where('academic_year', $row['academic_year'])
                    ->exists();

                if ($exists) { $skipped++; continue; }

                Scholarship::create($row);
                $imported++;
            }

            $errors = $parsed['errors'];

            ImportBatch::create([
                'user_id'    => $request->user()?->id,
                'filename'   => $request->file('file')->getClientOriginalName(),
                'total_rows' => count($parsed['rows']) + count($errors),
                'imported'   => $imported,
                'skipped'    => $skipped,
                'failed'     => count($errors),
                'errors'     => $errors,
            ]);

            DB::commit();
            app(DuplicateAidDetector::class)->rebuild();

            return response()->json([
                'imported' => $imported,
                'skipped'  => $skipped,
                'failed'   => count($errors),
                'errors'   => $errors,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

    public function history()
    {
        return response()->json([
            'data' => ImportBatch::orderByDesc('id')->limit(20)->get(),
        ]);
    }

    // ---------------- Sheet mode ----------------

    public function sheetTemplate()
    {
        $csv = "S No.,Name of the Student,Roll No.,Cheque No,Dated,Scholarship Stipend,Remarks\n";
        $csv .= "1,Imran Yousaf,2021-CS-001,PMLTC-R-001,2025-09-10,180000,Approved\n";
        $csv .= "2,Rabia Aslam,2021-CS-002,PMLTC-R-002,2025-09-10,180000,Approved\n";

        return response($csv, 200, [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="scholarship-sheet-template.csv"',
        ]);
    }

    public function sheetValidate(Request $request)
    {
        $context = $this->sheetContext($request);
        $parsed = $this->parseScholarshipSheet($request->file('file'), $context);

        return response()->json([
            'context'       => $context,
            'rows'          => $parsed['rows'],
            'valid_count'   => $parsed['valid_count'],
            'invalid_count' => $parsed['invalid_count'],
        ]);
    }

    public function sheetCommit(Request $request)
    {
        $context = $this->sheetContext($request);
        $parsed = $this->parseScholarshipSheet($request->file('file'), $context);

        $imported = 0;
        $skipped = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            $this->ensureLookups(array_map(
                fn ($r) => array_merge($r, $context),
                array_filter($parsed['rows'], fn ($r) => empty($r['_errors']))
            ));

            foreach ($parsed['rows'] as $row) {
                if (!empty($row['_errors'])) {
                    $skipped++;
                    $errors[] = "S No. {$row['s_no']}: " . implode('; ', $row['_errors']);
                    continue;
                }

                $exists = Scholarship::where('student_id', $row['student_id'])
                    ->where('scheme', $context['scheme'])
                    ->where('academic_year', $context['academic_year'])
                    ->exists();

                if ($exists) { $skipped++; continue; }

                Scholarship::create([
                    'student_id'      => $row['student_id'],
                    'student_name'    => $row['student_name'],
                    'cnic'            => null,
                    'scheme'          => $context['scheme'],
                    'category'        => $context['category'],
                    'academic_year'   => $context['academic_year'],
                    'donor'           => $context['donor'],
                    'funding_group'   => $context['funding_group'],
                    'approved_amount' => $row['approved_amount'],
                    'cheque_no'       => $row['cheque_no'],
                    'received_date'   => $row['received_date'],
                    'payment_status'  => $row['payment_status'],
                    'renewal_status'  => $row['renewal_status'],
                    'notes'           => $row['notes'],
                ]);
                $imported++;
            }

            ImportBatch::create([
                'user_id'    => $request->user()?->id,
                'filename'   => $request->file('file')->getClientOriginalName(),
                'total_rows' => count($parsed['rows']),
                'imported'   => $imported,
                'skipped'    => $skipped,
                'failed'     => $parsed['invalid_count'],
                'errors'     => $errors,
            ]);

            DB::commit();
            app(DuplicateAidDetector::class)->rebuild();

            return response()->json([
                'imported' => $imported,
                'skipped'  => $skipped,
                'failed'   => $parsed['invalid_count'],
                'errors'   => $errors,
            ], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

    private function sheetContext(Request $request): array
    {
        $request->validate([
            'file'          => 'required|file|mimes:csv,txt|max:10240',
            'scheme'        => 'required|string|max:100',
            'donor'         => 'required|string|max:100',
            'academic_year' => 'required|string|max:20',
            'category'      => 'required|in:fresh,renewal',
            'funding_group' => 'nullable|string|max:100',
        ]);

        return [
            'scheme'        => trim($request->input('scheme')),
            'donor'         => trim($request->input('donor')),
            'academic_year' => trim($request->input('academic_year')),
            'category'      => $request->input('category'),
            'funding_group' => trim($request->input('funding_group')) ?: null,
        ];
    }

    private function parseScholarshipSheet($file, array $context): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        if (!$handle) return ['rows' => [], 'valid_count' => 0, 'invalid_count' => 0];

        $all = [];
        while (($data = fgetcsv($handle)) !== false) $all[] = $data;
        fclose($handle);

        $headerIdx = $this->findHeaderRow($all);
        if ($headerIdx === null) {
            return ['rows' => [], 'valid_count' => 0, 'invalid_count' => 1];
        }

        $colMap = $this->mapSheetColumns($all[$headerIdx]);

        if (!isset($colMap['student_id']) || !isset($colMap['approved_amount'])) {
            return ['rows' => [], 'valid_count' => 0, 'invalid_count' => 1];
        }

        $rows = [];
        $valid = 0;
        $invalid = 0;

        for ($i = $headerIdx + 1; $i < count($all); $i++) {
            $raw = $all[$i];
            if (count(array_filter($raw, fn ($c) => trim((string) $c) !== '')) === 0) continue;

            $firstCell = strtolower(trim($raw[0] ?? ''));
            if (preg_match('/^(total|grand\s*total|sum)/i', $firstCell)) continue;

            $row = $this->normaliseSheetRow($raw, $colMap, $context);
            $row['_errors'] = $this->validateSheetRow($row);

            empty($row['_errors']) ? $valid++ : $invalid++;
            $rows[] = $row;
        }

        return ['rows' => $rows, 'valid_count' => $valid, 'invalid_count' => $invalid];
    }

    private function findHeaderRow(array $all): ?int
    {
        $keywords = ['name', 'roll', 'cheque', 'dated', 'date', 'stipend', 'amount', 'remarks', 's no', 's.no'];
        foreach ($all as $idx => $row) {
            $joined = strtolower(implode(' ', array_map(fn ($c) => (string) $c, $row)));
            $matches = 0;
            foreach ($keywords as $kw) if (strpos($joined, $kw) !== false) $matches++;
            if ($matches >= 3) return $idx;
        }
        return null;
    }

    private function mapSheetColumns(array $headerRow): array
    {
        $map = [];
        foreach ($headerRow as $i => $cell) {
            $c = strtolower(trim((string) $cell));
            if ($c === '') continue;

            if (preg_match('/^(s[\s\.]*no|serial|sr[\s\.]*|no\.?|#)/i', $c)) $map['s_no'] = $i;
            elseif (preg_match('/name/i', $c)) $map['student_name'] = $i;
            elseif (preg_match('/roll|student\s*id|reg/i', $c)) $map['student_id'] = $i;
            elseif (preg_match('/cheque|chq|check/i', $c)) $map['cheque_no'] = $i;
            elseif (preg_match('/dat|received/i', $c)) $map['received_date'] = $i;
            elseif (preg_match('/stipend|amount|money|pkrs?|rs/i', $c)) $map['approved_amount'] = $i;
            elseif (preg_match('/remark|note|comment/i', $c)) $map['notes'] = $i;
        }
        return $map;
    }

    private function normaliseSheetRow(array $raw, array $colMap, array $context): array
    {
        $get = fn ($key) => isset($colMap[$key]) ? trim((string) ($raw[$colMap[$key]] ?? '')) : '';

        $amount = $this->parseAmount($get('approved_amount'));
        $receivedDate = $this->parseDate($get('received_date'));
        $chequeNo = $get('cheque_no') ?: null;

        if ($receivedDate && $chequeNo) $paymentStatus = 'paid';
        elseif ($chequeNo) $paymentStatus = 'partial';
        else $paymentStatus = 'pending';

        if ($context['category'] === 'fresh') $renewalStatus = 'not_due';
        else $renewalStatus = $paymentStatus === 'paid' ? 'approved' : 'submitted';

        return [
            's_no'            => $get('s_no') ?: null,
            'student_id'      => $get('student_id'),
            'student_name'    => $get('student_name') ?: null,
            'approved_amount' => $amount,
            'cheque_no'       => $chequeNo,
            'received_date'   => $receivedDate,
            'payment_status'  => $paymentStatus,
            'renewal_status'  => $renewalStatus,
            'notes'           => $get('notes') ?: null,
        ];
    }

    private function validateSheetRow(array $row): array
    {
        $errors = [];
        if (!$row['student_id']) $errors[] = 'Roll No. required';
        if ($row['approved_amount'] === null || $row['approved_amount'] <= 0) $errors[] = 'Stipend required (>0)';
        return $errors;
    }

    private function parseAmount($input): ?float
    {
        if ($input === null || $input === '') return null;
        $cleaned = preg_replace('/[^\d.]/', '', (string) $input);
        return $cleaned === '' ? null : (float) $cleaned;
    }

    private function parseDate($input): ?string
    {
        if ($input === null || $input === '') return null;
        $input = trim((string) $input);
        if (in_array(strtolower($input), ['n/a', '-', 'nil', 'null', 'na'], true)) return null;

        $formats = ['Y-m-d', 'd/m/Y', 'd-m-Y', 'd/M/Y', 'd-m-y', 'd/m/y', 'd-M-Y', 'd-M-y', 'Y/m/d'];
        foreach ($formats as $fmt) {
            $dt = \DateTime::createFromFormat('!' . $fmt, $input);
            if ($dt !== false && $dt->format($fmt) === $input) return $dt->format('Y-m-d');
        }

        try { return \Carbon\Carbon::parse($input)->format('Y-m-d'); }
        catch (\Throwable $e) { return null; }
    }

    // ---------------- Full 13-column parsing ----------------

    private function parseCsv($file): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        if (!$handle) return ['columns' => [], 'rows' => [], 'errors' => ['Cannot open file.']];

        $header = fgetcsv($handle);
        if (!$header) { fclose($handle); return ['columns' => [], 'rows' => [], 'errors' => ['Empty file.']]; }

        $header = array_map(fn ($h) => strtolower(trim($h)), $header);
        $missing = array_diff(self::COLUMNS, $header);
        if ($missing) {
            fclose($handle);
            return ['columns' => $header, 'rows' => [], 'errors' => ['Missing columns: ' . implode(', ', $missing)]];
        }

        $rows = [];
        $errors = [];
        $lineNumber = 1;

        while (($data = fgetcsv($handle)) !== false) {
            $lineNumber++;
            if (count($data) !== count($header)) {
                $errors[] = "Row {$lineNumber}: column count mismatch.";
                continue;
            }

            $row = $this->normalizeRow(array_combine($header, $data));
            $validation = $this->validateRow($row);
            if ($validation !== true) { $errors[] = "Row {$lineNumber}: {$validation}"; continue; }

            $rows[] = $row;
        }

        fclose($handle);
        return ['columns' => $header, 'rows' => $rows, 'errors' => $errors];
    }

    private function normalizeRow(array $row): array
    {
        return [
            'student_id'      => trim($row['student_id'] ?? ''),
            'student_name'    => trim($row['student_name'] ?? '') ?: null,
            'cnic'            => trim($row['cnic'] ?? '') ?: null,
            'scheme'          => trim($row['scheme'] ?? ''),
            'category'        => strtolower(trim($row['category'] ?? 'fresh')) ?: 'fresh',
            'academic_year'   => trim($row['academic_year'] ?? ''),
            'donor'           => trim($row['donor'] ?? ''),
            'funding_group'   => trim($row['funding_group'] ?? '') ?: null,
            'approved_amount' => trim($row['approved_amount'] ?? ''),
            'cheque_no'       => trim($row['cheque_no'] ?? '') ?: null,
            'received_date'   => trim($row['received_date'] ?? '') ?: null,
            'payment_status'  => strtolower(trim($row['payment_status'] ?? 'pending')) ?: 'pending',
            'renewal_status'  => strtolower(trim($row['renewal_status'] ?? 'not_due')) ?: 'not_due',
        ];
    }

    private function validateRow(array $row)
    {
        if (!$row['student_id']) return 'student_id required.';
        if ($row['cnic'] && !preg_match('/^\d{5}-\d{7}-\d$/', $row['cnic'])) return 'Invalid CNIC format.';
        if (!$row['scheme']) return 'scheme required.';
        if (!in_array($row['category'], ['fresh', 'renewal'], true)) return 'Invalid category.';
        if (!$row['academic_year']) return 'academic_year required.';
        if (!$row['donor']) return 'donor required.';
        if (!is_numeric($row['approved_amount']) || (float) $row['approved_amount'] < 0) return 'Invalid approved_amount.';
        if (!in_array($row['payment_status'], ['pending','partial','paid','failed'], true)) return 'Invalid payment_status.';
        if (!in_array($row['renewal_status'], ['not_due','due','submitted','approved','rejected'], true)) return 'Invalid renewal_status.';

        if ($row['received_date'] && $row['payment_status'] === 'pending') $row['payment_status'] = 'paid';
        $row['approved_amount'] = (float) $row['approved_amount'];
        return true;
    }

    private function ensureLookups(array $rows): void
    {
        $map = [
            'scheme'        => 'scheme',
            'donor'         => 'donor',
            'academic_year' => 'academic_year',
            'funding_group' => 'funding_group',
        ];

        foreach ($map as $type => $field) {
            $values = collect($rows)->pluck($field)->filter()->unique();
            foreach ($values as $name) {
                Lookup::firstOrCreate(
                    ['type' => $type, 'name' => $name],
                    ['sort_order' => 999, 'active' => true]
                );
            }
        }
    }
}
