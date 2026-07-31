import { useState } from "react";

import {
  Button
} from "@/components/ui/button";

import {
  Shuffle
} from "lucide-react";


interface Player {

  id:string;

  player_name:string;

  club?:string|null;

}



interface Props {

  players:Player[];

}



export function GroupGenerator({

players

}:Props){



const [groups,setGroups]=useState<Player[][]>([]);



const [groupCount,setGroupCount]=useState(3);




const generateGroups=()=>{


if(players.length===0)
return;



const shuffled=[...players].sort(
()=>Math.random()-0.5
);



const result:Array<Player[]> = 
Array.from(
{
length:groupCount
},
()=>[]
);



shuffled.forEach(
(player,index)=>{


result[
index % groupCount
]
.push(player);


}

);



setGroups(result);



};





return (

<div className="space-y-5 mt-5">


<div className="
flex gap-3 items-center
">


<select

className="
border rounded-lg p-2 bg-background
"

value={groupCount}

onChange={(e)=>
setGroupCount(
Number(e.target.value)
)
}

>


<option value={2}>
2 Groups
</option>


<option value={3}>
3 Groups
</option>


<option value={4}>
4 Groups
</option>


<option value={5}>
5 Groups
</option>


<option value={6}>
6 Groups
</option>


<option value={7}>
7 Groups
</option>


</select>




<Button
onClick={generateGroups}
>


<Shuffle className="mr-2 h-4 w-4"/>

Randomize Groups


</Button>


</div>





<div className="
grid md:grid-cols-3 gap-4
">


{

groups.map(
(group,index)=>(


<div

key={index}

className="
border rounded-xl p-4
"

>


<h3 className="
font-bold mb-3
">

Group {String.fromCharCode(65+index)}

</h3>




{

group.map(player=>(


<div

key={player.id}

className="
flex justify-between
border-b py-2 text-sm
"

>


<span>
{player.player_name}
</span>


{

player.club &&

<span className="
text-muted-foreground
">

{player.club}

</span>

}


</div>


))

}



</div>


)

)

}


</div>



</div>

);

}
