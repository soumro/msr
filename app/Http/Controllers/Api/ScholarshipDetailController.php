<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Scholarship;
use App\Models\ScholarshipDocument;
use App\Models\ScholarshipNote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ScholarshipDetailController extends Controller
{
    // -------------------------------------------------------------
    // NOTES
    // -------------------------------------------------------------

    public function notes(Scholarship $scholarship)
    {
        return response()->json([
            'data' => $scholarship->hasMany(ScholarshipNote::class)->orderByDesc('id')->get(),
        ]);
    }

    public function storeNote(Request $request, Scholarship $scholarship)
    {
        $data = $request->validate([
            'body' => 'required|string|max:5000',
        ]);

        $note = ScholarshipNote::create([
            'scholarship_id' => $scholarship->id,
            'user_id'        => auth()->id(),
            'user_email'     => auth()->user()?->email,
            'body'           => $data['body'],
        ]);

        return response()->json($note, 201);
    }

    public function destroyNote(Scholarship $scholarship, ScholarshipNote $note)
    {
        if ($note->scholarship_id !== $scholarship->id) abort(404);
        $note->delete();
        return response()->noContent();
    }

    // -------------------------------------------------------------
    // DOCUMENTS
    // -------------------------------------------------------------

    public function documents(Scholarship $scholarship)
    {
        return response()->json([
            'data' => $scholarship->hasMany(ScholarshipDocument::class)->orderByDesc('id')->get(),
        ]);
    }

    public function storeDocument(Request $request, Scholarship $scholarship)
    {
        $data = $request->validate([
            'file'        => 'required|file|max:20480', // 20 MB
            'category'    => 'required|in:approval,disbursement,id_card,transcript,income_certificate,other',
            'description' => 'nullable|string|max:1000',
        ]);

        $file = $request->file('file');
        $path = $file->store("scholarships/{$scholarship->id}/documents", 'local');

        $doc = ScholarshipDocument::create([
            'scholarship_id' => $scholarship->id,
            'user_id'        => auth()->id(),
            'original_name'  => $file->getClientOriginalName(),
            'stored_path'    => $path,
            'mime_type'      => $file->getMimeType(),
            'size_bytes'     => $file->getSize(),
            'category'       => $data['category'],
            'description'    => $data['description'] ?? null,
        ]);

        return response()->json($doc, 201);
    }

    public function destroyDocument(Scholarship $scholarship, ScholarshipDocument $document)
    {
        if ($document->scholarship_id !== $scholarship->id) abort(404);

        if (Storage::disk('local')->exists($document->stored_path)) {
            Storage::disk('local')->delete($document->stored_path);
        }

        $document->delete();
        return response()->noContent();
    }

    public function downloadDocument(Scholarship $scholarship, ScholarshipDocument $document)
    {
        if ($document->scholarship_id !== $scholarship->id) abort(404);

        if (!Storage::disk('local')->exists($document->stored_path)) {
            abort(404, 'File not found on disk.');
        }

        return Storage::disk('local')->download($document->stored_path, $document->original_name);
    }

    // -------------------------------------------------------------
    // RELATED + HISTORY
    // -------------------------------------------------------------

    public function related(Scholarship $scholarship)
    {
        $query = Scholarship::where('id', '!=', $scholarship->id);

        $query->where(function ($w) use ($scholarship) {
            if ($scholarship->cnic) {
                $w->where('cnic', $scholarship->cnic);
            }
            if ($scholarship->student_id) {
                $w->orWhere('student_id', $scholarship->student_id);
            }
        });

        return response()->json([
            'data' => $query->orderByDesc('academic_year')->get(),
        ]);
    }

    public function history(Scholarship $scholarship)
    {
        $logs = AuditLog::where('model_type', Scholarship::class)
            ->where('model_id', $scholarship->id)
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        return response()->json(['data' => $logs]);
    }
}
