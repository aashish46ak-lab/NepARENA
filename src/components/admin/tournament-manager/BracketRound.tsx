import type { Match } from "@/lib/supabase";



interface Props {

  matches: Match[];

  nameOf: (
    id:string|null
  )=>string;

}



export function BracketRound({

matches,

nameOf

}:Props){



if(matches.length===0){

return (

<div className="
text-sm text-muted-foreground
">

No matches available

</div>

);

}



return (

<div className="space-y-3">


{

matches.map(match=>(


<div

key={match.id}

className="
border
rounded-xl
p-4
bg-card
"

>


<div className="
flex
items-center
justify-between
gap-3
"

>


<span className="font-medium">

{nameOf(match.home_id)}

</span>



<div className="
text-center
"

>

{

match.played

?

<span className="font-bold">

{match.home_score}

-

{match.away_score}

</span>


:

<span className="
text-muted-foreground
">

VS

</span>

}


</div>



<span className="font-medium">

{nameOf(match.away_id)}

</span>



</div>




{

(match as any).extra_time &&

<div className="
text-xs mt-2 text-muted-foreground
">

Extra Time:

{(match as any).extra_time}

</div>

}




{

(match as any).penalty_home !== null &&

<div className="
text-xs mt-1
">

Penalty:

{(match as any).penalty_home}

-

{(match as any).penalty_away}

</div>

}




</div>


))

}


</div>

);

}
