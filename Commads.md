bash```

$map=['EL'=>'Electrical Engineering','CE'=>'Civil Engineering','ME'=>'Mechanical Engineering','PG'=>'Petroleum and Natural Engineering','SW'=>'Software Engineering','ES'=>'Electronics Engineering'];$u=0;$unk=[];foreach(App\Models\Scholarship::all() as $s){if($s->department)continue;$c=strtoupper(substr(trim($s->student_id),3,2));if(isset($map[$c])){$s->department=$map[$c];$s->saveQuietly();$u++;}else{$unk[$c]=($unk[$c]??0)+1;}}echo"Updated: $u\n";if($unk){arsort($unk);print_r($unk);}

````



bash```


$map=['EL'=>'Electrical Engineering','CE'=>'Civil Engineering','ME'=>'Mechanical Engineering','PG'=>'Petroleum and Natural Engineering','SW'=>'Software Engineering','ES'=>'Electronics Engineering'];$u=0;foreach(App\Models\Scholarship::whereNull('department')->orWhere('department','')->get() as $s){if(preg_match('/(EL|CE|ME|PG|SW|ES)/i',$s->student_id,$m)){$s->department=$map[strtoupper($m[1])];$s->saveQuietly();$u++;}}echo"Fixed via regex: $u\n";`

```

````
