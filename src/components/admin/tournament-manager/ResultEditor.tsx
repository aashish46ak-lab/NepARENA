import { useState } from "react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { Save } from "lucide-react";

import type { Match } from "@/lib/supabase";


interface Props {

  match: Match;

  home: string;

  away: string;

  onSave: (
    match: Match,
    home: string,
    away: string
  ) => Promise<void>;

}



export function ResultEditor({
  match,
  home,
  away,
  onSave
}: Props) {


const [homeScore,setHomeScore] =
useState(
  match.home_score?.toString() ?? ""
);


const [awayScore,setAwayScore] =
useState(
  match.away_score?.toString() ?? ""
);



return (

<div
className="
flex items-center gap-3
border rounded-xl
p-3
"
>


<div className="
flex-1 text-right text-sm
">
{home}
</div>



<Input

className="w-16 text-center"

inputMode="numeric"

value={homeScore}

onChange={(e)=>
setHomeScore(e.target.value)
}

/>



<span>
-
</span>



<Input

className="w-16 text-center"

inputMode="numeric"

value={awayScore}

onChange={(e)=>
setAwayScore(e.target.value)
}

/>



<div className="
flex-1 text-sm
">
{away}
</div>




<Button

size="icon"

onClick={()=>
onSave(
match,
homeScore,
awayScore
)
}

>

<Save className="h-4 w-4"/>

</Button>



</div>

);

}
