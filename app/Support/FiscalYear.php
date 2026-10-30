<?php

namespace App\Support;

use Carbon\Carbon;

class FiscalYear
{
    public static function startMonth(): int
    {
        return (int) config('fiscal.start_month', 7);
    }

    public static function startDay(): int
    {
        return (int) config('fiscal.start_day', 1);
    }

    /** "2025-2026" for the fiscal year containing the given date. */
    public static function ofDate($date): string
    {
        $d = Carbon::parse($date);

        $startMonth = self::startMonth();
        $startDay   = self::startDay();

        // If the date is on/after the FY start this calendar year → FY starts this year
        // Otherwise → FY started last calendar year
        $fyStartYear = ($d->month > $startMonth)
            || ($d->month === $startMonth && $d->day >= $startDay)
            ? $d->year
            : $d->year - 1;

        return self::label($fyStartYear);
    }

    /** Fiscal year containing TODAY, e.g. "2026-2027" if today is Oct 2026. */
    public static function current(): string
    {
        return self::ofDate(Carbon::now());
    }

    /** Fiscal year immediately following the given one. */
    public static function next(string $fiscalYear): string
    {
        $start = self::parseStart($fiscalYear);
        return self::label($start + 1);
    }

    /** Fiscal year immediately before the given one. */
    public static function previous(string $fiscalYear): string
    {
        $start = self::parseStart($fiscalYear);
        return self::label($start - 1);
    }

    /** Carbon date of the FIRST day of a fiscal year. */
    public static function startOf(string $fiscalYear): Carbon
    {
        $startYear = self::parseStart($fiscalYear);
        return Carbon::create($startYear, self::startMonth(), self::startDay(), 0, 0, 0);
    }

    /** Carbon date of the LAST day of a fiscal year (inclusive). */
    public static function endOf(string $fiscalYear): Carbon
    {
        return self::startOf(self::next($fiscalYear))->subSecond();
    }

    /** True if the given date is inside the given fiscal year. */
    public static function containsDate(string $fiscalYear, $date): bool
    {
        $d = Carbon::parse($date);
        return $d->betweenIncluded(
            self::startOf($fiscalYear),
            self::endOf($fiscalYear)
        );
    }

    /** Array of 12 month labels in FY order (Jul, Aug, Sep, ..., Jun). */
    public static function monthsOf(string $fiscalYear): array
    {
        $labels = [];
        $start = self::startOf($fiscalYear);
        for ($i = 0; $i < 12; $i++) {
            $labels[] = $start->copy()->addMonths($i)->format('M');
        }
        return $labels;
    }

    /** Array of fiscal years from $from to $to (inclusive), descending. */
    public static function range(string $from, string $to): array
    {
        $startA = self::parseStart($from);
        $startB = self::parseStart($to);
        if ($startA > $startB) [$startA, $startB] = [$startB, $startA];

        $years = [];
        for ($y = $startB; $y >= $startA; $y--) {
            $years[] = self::label($y);
        }
        return $years;
    }

    // ─────────────────────────────────────────────
    // Internal
    // ─────────────────────────────────────────────

    public static function label(int $startYear): string
    {
        $format = config('fiscal.label_format', '{start}-{end}');
        return str_replace(
            ['{start}', '{end}'],
            [$startYear, $startYear + 1],
            $format
        );
    }

    private static function parseStart(string $fiscalYear): int
    {
        // Try "2025-2026", "FY2025", "2025"
        if (preg_match('/^(\d{4})-(\d{4})$/', $fiscalYear, $m)) return (int) $m[1];
        if (preg_match('/^FY(\d{4})$/i', $fiscalYear, $m))    return (int) $m[1];
        if (preg_match('/^(\d{4})$/', $fiscalYear, $m))       return (int) $m[1];
        return (int) now()->year;
    }
}
