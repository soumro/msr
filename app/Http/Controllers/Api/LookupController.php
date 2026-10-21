<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lookup;
use App\Models\Scholarship;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LookupController extends Controller
{
    public function index(Request $request)
    {
        $query = Lookup::query();

        if ($request->filled('type')) {
            $query->where('type', $request->input('type'));
        }

        if (!$request->boolean('include_inactive')) {
            $query->where('active', true);
        }

        $items = $query->orderBy('sort_order')->orderBy('name')->get();

        if ($request->boolean('with_usage')) {
            $items->each(function ($item) {
                $item->usage_count = match ($item->type) {
                    'scheme'        => Scholarship::where('scheme', $item->name)->count(),
                    'donor'         => Scholarship::where('donor', $item->name)->count(),
                    'academic_year' => Scholarship::where('academic_year', $item->name)->count(),
                    'funding_group' => Scholarship::where('funding_group', $item->name)->count(),
                    default         => 0,
                };
            });
        }

        return response()->json(['data' => $items]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['scheme', 'donor', 'academic_year', 'funding_group'])],
            'name' => 'required|string|max:120',
        ]);

        $data['name'] = trim($data['name']);

        $lookup = Lookup::firstOrCreate(
            ['type' => $data['type'], 'name' => $data['name']],
            ['sort_order' => 999, 'active' => true]
        );

        return response()->json($lookup, $lookup->wasRecentlyCreated ? 201 : 200);
    }

    public function update(Request $request, Lookup $lookup)
    {
        $data = $request->validate([
            'name'       => 'sometimes|string|max:120',
            'sort_order' => 'sometimes|integer',
            'active'     => 'sometimes|boolean',
        ]);

        if (isset($data['name'])) {
            $data['name'] = trim($data['name']);

            $exists = Lookup::where('type', $lookup->type)
                ->where('name', $data['name'])
                ->where('id', '!=', $lookup->id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => "A {$lookup->type} named '{$data['name']}' already exists.",
                ], 422);
            }

            $oldName = $lookup->name;
            if ($oldName !== $data['name']) {
                match ($lookup->type) {
                    'scheme'        => Scholarship::where('scheme', $oldName)->update(['scheme' => $data['name']]),
                    'donor'         => Scholarship::where('donor', $oldName)->update(['donor' => $data['name']]),
                    'academic_year' => Scholarship::where('academic_year', $oldName)->update(['academic_year' => $data['name']]),
                    'funding_group' => Scholarship::where('funding_group', $oldName)->update(['funding_group' => $data['name']]),
                };
            }
        }

        $lookup->update($data);
        return response()->json($lookup);
    }

    public function destroy(Lookup $lookup, Request $request)
    {
        $usage = match ($lookup->type) {
            'scheme'        => Scholarship::where('scheme', $lookup->name)->count(),
            'donor'         => Scholarship::where('donor', $lookup->name)->count(),
            'academic_year' => Scholarship::where('academic_year', $lookup->name)->count(),
            'funding_group' => Scholarship::where('funding_group', $lookup->name)->count(),
            default         => 0,
        };

        if ($usage > 0 && !$request->boolean('force')) {
            return response()->json([
                'message' => "Cannot delete: {$usage} record(s) still use this value.",
                'usage'   => $usage,
            ], 409);
        }

        $lookup->delete();
        return response()->noContent();
    }

    public function reorder(Request $request)
    {
        $data = $request->validate([
            'order'   => 'required|array',
            'order.*' => 'integer|exists:lookups,id',
        ]);

        foreach ($data['order'] as $i => $id) {
            Lookup::where('id', $id)->update(['sort_order' => $i]);
        }

        return response()->json(['ok' => true]);
    }
}
