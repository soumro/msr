<?php
namespace App\Models;
use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    use Auditable;
    protected $fillable = ['scholarship_id', 'promoted_at','student_id','student_name','cnic','scheme','academic_year','eligibility','status','decision_date','rejection_reason','notes'];
    protected $casts = ['decision_date' => 'date' , 'promoted_at'   => 'datetime',];

    public function scholarship()
    {
        return $this->belongsTo(Scholarship::class);
    }
}
