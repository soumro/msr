<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Fiscal Year Start
    |--------------------------------------------------------------------------
    | Default: July 1. Change these to shift the fiscal year boundary.
    | Example: start_month = 4, start_day = 1 → April 1 to March 31.
    */
    'start_month' => 7,
    'start_day'   => 1,

    /*
    |--------------------------------------------------------------------------
    | Fiscal Year Label Format
    |--------------------------------------------------------------------------
    | {start}/{end} = the two 4-digit years.
    | Default produces "2025-2026".
    | Use "FY{start}" for "FY2025" style, or "{start}" for just the start year.
    */
    'label_format' => '{start}-{end}',
];
