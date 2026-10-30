<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnnouncementDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AnnouncementDocumentController extends Controller
{
    public function index(Announcement $announcement)
    {
        return response()->json([
            'data' => AnnouncementDocument::where('announcement_id', $announcement->id)
                ->orderByDesc('id')
                ->get(),
        ]);
    }

    public function store(Request $request, Announcement $announcement)
    {
        $data = $request->validate([
            'file'        => 'required|file|max:20480',
            'description' => 'nullable|string|max:1000',
        ]);

        $file = $request->file('file');
        $path = $file->store("announcements/{$announcement->id}/documents", 'local');

        $doc = AnnouncementDocument::create([
            'announcement_id' => $announcement->id,
            'user_id'         => auth()->id(),
            'original_name'   => $file->getClientOriginalName(),
            'stored_path'     => $path,
            'mime_type'       => $file->getMimeType(),
            'size_bytes'      => $file->getSize(),
            'description'     => $data['description'] ?? null,
        ]);

        return response()->json($doc, 201);
    }

    public function destroy(Announcement $announcement, AnnouncementDocument $document)
    {
        if ($document->announcement_id !== $announcement->id) abort(404);

        if (Storage::disk('local')->exists($document->stored_path)) {
            Storage::disk('local')->delete($document->stored_path);
        }

        $document->delete();
        return response()->noContent();
    }

    public function download(Announcement $announcement, AnnouncementDocument $document)
    {
        if ($document->announcement_id !== $announcement->id) abort(404);

        if (!Storage::disk('local')->exists($document->stored_path)) {
            abort(404, 'File not found on disk.');
        }

        return Storage::disk('local')->download($document->stored_path, $document->original_name);
    }
}
