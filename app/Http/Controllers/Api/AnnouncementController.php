<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $query = Announcement::query();

        if ($request->filled('category')) {
            $query->where('category', $request->input('category'));
        }

        if ($request->has('published') && $request->input('published') !== '') {
            $query->where('published', $request->boolean('published'));
        }

        return response()->json(['data' => $query->orderByDesc('id')->get()]);
    }

    public function store(Request $request)
    {
        return response()->json(Announcement::create($this->validateData($request)), 201);
    }

    public function show(Announcement $announcement)
    {
        return response()->json($announcement);
    }

    public function update(Request $request, Announcement $announcement)
    {
        $announcement->update($this->validateData($request));
        return response()->json($announcement);
    }

    public function destroy(Announcement $announcement)
    {
        $announcement->delete();
        return response()->noContent();
    }

    private function validateData(Request $request): array
    {
        $data = $request->validate([
            'title'     => 'required|string|max:200',
            'category'  => ['required', Rule::in(['announcement', 'deadline', 'guidance', 'renewal'])],
            'deadline'  => 'nullable|date',
            'published' => 'sometimes|boolean',
            'body'      => 'required|string',
        ]);

        if (empty($data['deadline'])) {
            $data['deadline'] = null;
        }
        if (!array_key_exists('published', $data)) {
            $data['published'] = true;
        }

        return $data;
    }
}
