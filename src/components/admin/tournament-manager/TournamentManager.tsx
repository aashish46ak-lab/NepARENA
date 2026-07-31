import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  supabase,
  type Tournament,
  type TournamentParticipant,
  type Match,
} from "@/lib/supabase";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Shuffle, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { ResultEditor } from "./ResultEditor";
import { BracketRound } from "./BracketRound";
import { GroupGenerator } from "./GroupGenerator";

import type { Standing } from "./types";


export function TournamentManager({
  tournament,
  open,
  onOpenChange,
}:{
  tournament:Tournament;
  open:boolean;
  onOpenChange:(v:boolean)=>void;
}){


const qc = useQueryClient();


const [loading,setLoading]=useState(true);

const [busy,setBusy]=useState(false);


const [players,setPlayers]
=
useState<TournamentParticipant[]>([]);


const [matches,setMatches]
=
useState<Match[]>([]);


const [standings,setStandings]
=
useState<Standing[]>([]);


const [name,setName]=useState("");

const [club,setClub]=useState("");



const load = useCallback(async()=>{


setLoading(true);


const [
p,
m,
s
]=await Promise.all([


supabase
.from("tournament_participants")
.select("*")
.eq(
"tournament_id",
tournament.id
),


supabase
.from("matches")
.select("*")
.eq(
"tournament_id",
tournament.id
)
.order("round"),


supabase
.from("tournament_standings")
.select("*")
.eq(
"tournament_id",
tournament.id
)


]);


setPlayers(
(p.data ?? []) as TournamentParticipant[]
);


setMatches(
(m.data ?? []) as Match[]
);


setStandings(
(s.data ?? []) as Standing[]
);


setLoading(false);


},[tournament.id]);



useEffect(()=>{

if(open)
load();

},[open,load]);



const approved =
players.filter(
p=>p.status==="approved"
);



const playerName=(id:string|null)=>{

return players.find(
p=>p.id===id
)?.player_name ?? "TBD";

};



const addPlayer=async()=>{


if(!name.trim())
return;


const {error}=await supabase
.from("tournament_participants")
.insert({

tournament_id:tournament.id,

player_name:name,

club:club || null,

status:"approved"

});


if(error)
return toast.error(error.message);


setName("");

setClub("");

load();


};



const deletePlayer=async(id:string)=>{


await supabase
.from("tournament_participants")
.delete()
.eq("id",id);


load();

};



const saveResult=async(
match:Match,
home:string,
away:string
)=>{


await supabase
.from("matches")
.update({

home_score:Number(home),

away_score:Number(away),

played:true

})
.eq(
"id",
match.id
);


toast.success(
"Result updated"
);


load();


};




const generateFixtures=async()=>{


if(approved.length<2)
return toast.error(
"Need minimum 2 players"
);



setBusy(true);



await supabase
.from("matches")
.delete()
.eq(
"tournament_id",
tournament.id
);



const shuffled=[
...approved
]
.sort(
()=>Math.random()-0.5
);



const payload:any[]=[];


let round=1;


for(
let i=0;
i<shuffled.length;
i++
){


for(
let j=i+1;
j<shuffled.length;
j++
){


payload.push({

tournament_id:tournament.id,

round,

position:payload.length+1,

home_id:shuffled[i].id,

away_id:shuffled[j].id,

played:false

});


}

}



const {error}=await supabase
.from("matches")
.insert(payload);


setBusy(false);



if(error)
return toast.error(error.message);


toast.success(
"Fixtures generated"
);


load();


};




return (

<Dialog
open={open}
onOpenChange={onOpenChange}
>


<DialogContent
className="
max-w-6xl
max-h-[90vh]
overflow-y-auto
"
>


<DialogHeader>

<DialogTitle>
🏆 {tournament.name}
</DialogTitle>

</DialogHeader>



{
loading ?

<div className="flex justify-center p-10">
<Loader2 className="animate-spin"/>
</div>


:

<Tabs defaultValue="overview">


<TabsList>

<TabsTrigger value="overview">
Overview
</TabsTrigger>


<TabsTrigger value="players">
Players
</TabsTrigger>


<TabsTrigger value="fixtures">
Fixtures
</TabsTrigger>


<TabsTrigger value="results">
Results
</TabsTrigger>


<TabsTrigger value="standings">
Standings
</TabsTrigger>


<TabsTrigger value="groups">
Groups
</TabsTrigger>


<TabsTrigger value="bracket">
Bracket
</TabsTrigger>


</TabsList>





<TabsContent value="overview">

<div className="grid md:grid-cols-3 gap-4 mt-5">


<div className="border rounded-xl p-4">
Players
<h2 className="text-3xl font-bold">
{players.length}
</h2>
</div>


<div className="border rounded-xl p-4">
Matches
<h2 className="text-3xl font-bold">
{matches.length}
</h2>
</div>


<div className="border rounded-xl p-4">
Prize
<h2 className="font-bold">
{tournament.prize_pool}
</h2>
</div>


</div>

</TabsContent>





<TabsContent value="players">


<div className="flex gap-2 mt-4">

<Input
placeholder="Player name"
value={name}
onChange={
e=>setName(e.target.value)
}
/>


<Input
placeholder="Club"
value={club}
onChange={
e=>setClub(e.target.value)
}
/>


<Button onClick={addPlayer}>
<UserPlus/>
</Button>


</div>



{
players.map(p=>(

<div
key={p.id}
className="border rounded-xl p-3 mt-2 flex justify-between"
>

{p.player_name}


<Button
variant="ghost"
onClick={()=>deletePlayer(p.id)}
>

<Trash2/>

</Button>


</div>


))

}


</TabsContent>





<TabsContent value="fixtures">


<Button
disabled={busy}
onClick={generateFixtures}
>

<Shuffle/>
Generate Fixtures

</Button>


</TabsContent>





<TabsContent value="results">


{
matches.map(m=>(

<ResultEditor
key={m.id}
match={m}
home={playerName(m.home_id)}
away={playerName(m.away_id)}
onSave={saveResult}
/>


))

}


</TabsContent>





<TabsContent value="groups">

<GroupGenerator
players={approved}
/>

</TabsContent>





<TabsContent value="bracket">


<BracketRound
matches={matches}
nameOf={playerName}
/>


</TabsContent>




<TabsContent value="standings">

<pre>
{JSON.stringify(
standings,
null,
2
)}
</pre>

</TabsContent>



</Tabs>

}


</DialogContent>


</Dialog>

)

}
