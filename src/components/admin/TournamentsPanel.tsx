import { useState } from "react";

import { AdminSection, EmptyState } from "./AdminUI";
import { useCrud } from "./crud";
import { RowEditor, Field } from "./RowEditor";

import { TournamentManager } from "@/components/tournament-manager/TournamentManager";

import type { Tournament } from "@/lib/supabase";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";

import { ImageUpload } from "@/components/ImageUpload";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";


import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


import {
  MoreVertical,
  Pencil,
  ImagePlus,
  Trash2,
  Settings2,
  Trophy,
  Radio,
} from "lucide-react";


import { toast } from "sonner";



const empty: Partial<Tournament> = {

slug:"",

name:"",

description:"",

banner_url:null,

status:"upcoming",

registration_open:false,

prize_pool:"",

participants_count:0,

starts_at:null,

ends_at:null,

};




export function TournamentsPanel(){



const {

rows,

loading,

create,

update,

remove

}=useCrud<Tournament>(

"tournaments",

{

invalidate:[

"tournaments",

"tournament_history",

"hall_of_fame"

]

}

);




const [editing,setEditing]=useState<Tournament|null>(null);


const [banner,setBanner]=useState<Tournament|null>(null);


const [manage,setManage]=useState<Tournament|null>(null);




const changeStatus = async(

tournament:Tournament,

status:Tournament["status"]

)=>{


const ok = await update(

tournament.id,

{

status,

registration_open:

status==="registration_open"

}

);



if(ok && status==="completed"){

toast.success(

"Tournament moved to history"

);

}


};




return (

<AdminSection

title="Tournament Overview"

description="Create, edit and manage all tournaments."

action={


<RowEditor

triggerVariant="create"

triggerLabel="Create Tournament"

title="Create Tournament"

initial={empty as Tournament}


onSave={(v)=>

create({

...v,

slug:

v.slug || slugify(v.name)

})

}


>


{({values,set})=>(

<TournamentFields

values={values}

set={set}

/>

)}

</RowEditor>


}


>
  {loading ? (

<div className="text-muted-foreground">
Loading tournaments...
</div>

)

:

rows.length===0 ?

<EmptyState message="No tournaments created yet."/>

:

<div className="space-y-3">

{rows.map((t)=>(

<div

key={t.id}

className="
flex items-center gap-4
rounded-xl
border border-border/60
p-4
"

>


<div className="
h-16 w-28
rounded-lg
overflow-hidden
bg-secondary
shrink-0
">


{
t.banner_url &&

<img

src={t.banner_url}

className="
h-full w-full object-cover
"

/>

}


</div>




<div className="flex-1">


<div className="flex items-center gap-2">


<h3 className="font-semibold">

{t.name}

</h3>


<Badge

variant="outline"

className="capitalize"

>


{
t.status==="completed"

?

"Ended"

:

t.status.replace("_"," ")

}


</Badge>


</div>



<div className="
text-xs
text-muted-foreground
mt-2
flex gap-3
">


<span>

Players:

{t.participants_count}

</span>


{
t.prize_pool &&

<span>

{t.prize_pool}

</span>

}


</div>


</div>




<div className="flex items-center gap-2">


<DropdownMenu>


<DropdownMenuTrigger asChild>


<Button

variant="ghost"

size="icon"

>

<MoreVertical className="h-4 w-4"/>

</Button>


</DropdownMenuTrigger>



<DropdownMenuContent align="end">



<DropdownMenuItem

onClick={()=>setEditing(t)}

>

<Pencil className="h-4 w-4 mr-2"/>

Edit Tournament

</DropdownMenuItem>




<DropdownMenuItem

onClick={()=>setBanner(t)}

>

<ImagePlus className="h-4 w-4 mr-2"/>

Change Banner

</DropdownMenuItem>



<DropdownMenuSeparator />



<DropdownMenuItem

onClick={()=>setManage(t)}

>

<Settings2 className="h-4 w-4 mr-2"/>

Manage Tournament

</DropdownMenuItem>



<DropdownMenuSeparator />



<DropdownMenuItem

onClick={()=>changeStatus(t,"ongoing")}

>

<Radio className="h-4 w-4 mr-2"/>

Set Ongoing

</DropdownMenuItem>




<DropdownMenuItem

onClick={()=>changeStatus(t,"completed")}

>

<Trophy className="h-4 w-4 mr-2"/>

End Tournament

</DropdownMenuItem>




<DropdownMenuSeparator />



<DropdownMenuItem

className="text-destructive"

onClick={()=>{

if(confirm(`Delete ${t.name}?`))

remove(t.id)

}}

>

<Trash2 className="h-4 w-4 mr-2"/>

Delete

</DropdownMenuItem>



</DropdownMenuContent>


</DropdownMenu>



</div>



</div>


))}


</div>

}




{
editing && (

<EditDialog

tournament={editing}

onClose={()=>setEditing(null)}

onSave={(v)=>update(editing.id,v)}

/>

)

}



{
banner && (

<Dialog

open

onOpenChange={()=>setBanner(null)}

>


<DialogContent>


<DialogHeader>

<DialogTitle>

Tournament Banner

</DialogTitle>

</DialogHeader>



<ImageUpload

value={banner.banner_url}

folder="tournaments"

aspect="wide"


onChange={async(url)=>{


await update(

banner.id,

{

banner_url:url

} as Partial<Tournament>

)


setBanner({

...banner,

banner_url:url

})


}}


/>



</DialogContent>


</Dialog>


)

}



{
{
manage && (

<TournamentManager

tournament={manage}

open={true}

onOpenChange={()=>setManage(null)}

/>

)

}


</AdminSection>

);

  }
function EditDialog({

tournament,

onClose,

onSave,

}:{

tournament:Tournament;

onClose:()=>void;

onSave:(v:Partial<Tournament>)=>Promise<unknown>;

}){


const [values,setValues]=useState<Tournament>(tournament);



const updateValue=(v:Partial<Tournament>)=>{

setValues(old=>({

...old,

...v

}));

};



return (

<Dialog

open

onOpenChange={onClose}

>


<DialogContent

className="
max-w-2xl
max-h-[85vh]
overflow-y-auto
"

>


<DialogHeader>

<DialogTitle>

Edit Tournament

</DialogTitle>

</DialogHeader>



<TournamentFields

values={values}

set={updateValue}

/>



<div className="flex justify-end gap-3 mt-5">


<Button

variant="outline"

onClick={onClose}

>

Cancel

</Button>



<Button

className="bg-gradient-brand"

onClick={async()=>{

await onSave(values);

onClose();

}}

>

Save Changes

</Button>


</div>


</DialogContent>


</Dialog>

);


}







function TournamentFields({

values,

set,

}:{

values:Tournament;

set:(v:Partial<Tournament>)=>void;

}){


return (

<>


<div className="grid gap-4 sm:grid-cols-2">


<Field label="Tournament Name">


<Input

value={values.name ?? ""}

onChange={(e)=>

set({

name:e.target.value

})

}

/>


</Field>




<Field label="Slug">


<Input

value={values.slug ?? ""}

onChange={(e)=>

set({

slug:e.target.value

})

}

/>


</Field>


</div>




<Field label="Description">


<Textarea

rows={4}

value={values.description ?? ""}

onChange={(e)=>

set({

description:e.target.value

})

}

/>


</Field>





<Field label="Tournament Banner">


<ImageUpload

value={values.banner_url}

folder="tournaments"

aspect="wide"


onChange={(url)=>

set({

banner_url:url

})

}


/>


</Field>





<div className="grid gap-4 sm:grid-cols-3">


<Field label="Status">


<Select

value={values.status}

onValueChange={(v)=>

set({

status:v as Tournament["status"]

})

}

>


<SelectTrigger>

<SelectValue />

</SelectTrigger>



<SelectContent>


<SelectItem value="upcoming">

Upcoming

</SelectItem>


<SelectItem value="registration_open">

Registration Open

</SelectItem>


<SelectItem value="ongoing">

Ongoing

</SelectItem>


<SelectItem value="completed">

Ended

</SelectItem>


</SelectContent>


</Select>


</Field>





<Field label="Prize Pool">


<Input

value={values.prize_pool ?? ""}

onChange={(e)=>

set({

prize_pool:e.target.value

})

}

/>


</Field>




<Field label="Players">


<Input

type="number"

value={values.participants_count ?? 0}

onChange={(e)=>

set({

participants_count:Number(e.target.value)

})

}

/>


</Field>


</div>






<div className="grid gap-4 sm:grid-cols-2">


<Field label="Start Date">


<Input

type="datetime-local"

value={

values.starts_at

?

values.starts_at.slice(0,16)

:

""

}


onChange={(e)=>

set({

starts_at:e.target.value

?

new Date(e.target.value).toISOString()

:

null

})

}


/>


</Field>





<Field label="End Date">


<Input

type="datetime-local"

value={

values.ends_at

?

values.ends_at.slice(0,16)

:

""

}


onChange={(e)=>

set({

ends_at:e.target.value

?

new Date(e.target.value).toISOString()

:

null

})

}


/>


</Field>


</div>






<label className="flex items-center gap-3 mt-4">


<Switch

checked={values.registration_open}

onCheckedChange={(v)=>

set({

registration_open:v

})

}

/>


Registration Open


</label>



</>

);


}







function slugify(text:string){

return text

.toLowerCase()

.trim()

.replace(

/[^a-z0-9]+/g,

"-"

)

.replace(

/^-|-$/g,

""

);

}
