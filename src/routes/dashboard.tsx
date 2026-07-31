import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { PageShell } from "@/components/PageShell";

import {
  Shield,
  Loader2,
  Trophy,
  Users,
  Settings,
  BarChart3,
  TrendingUp,
} from "lucide-react";

import { UsersPanel } from "@/components/admin/UsersPanel";
import { SiteSettingsPanel } from "@/components/admin/SiteSettingsPanel";


export const Route = createFileRoute("/dashboard")({
  ssr:false,
  component:DashboardPage,
});


function DashboardPage(){

  const {
    user,
    loading,
    isAdmin,
    isOwner
  } = useAuth();


  const router = useRouter();


  const [section,setSection] = useState<
    "dashboard" | "players" | "settings"
  >("dashboard");


  useEffect(()=>{

    if(!loading && !user){

      router.navigate({
        to:"/auth"
      });

    }

  },[loading,user]);



  if(
    loading ||
    !user
  ){

    return (

      <PageShell>

        <div className="
        min-h-[70vh]
        grid
        place-items-center
        ">

          <Loader2 className="
          h-7 w-7
          animate-spin
          "/>

        </div>

      </PageShell>

    );

  }



  if(!isAdmin){

    return (

      <PageShell>

        <div className="
        max-w-xl
        mx-auto
        py-20
        text-center
        ">

          <Shield className="
          h-10
          w-10
          mx-auto
          text-brand
          "/>


          <h1 className="
          text-3xl
          font-bold
          mt-4
          ">
            Admin Access Only
          </h1>


          <Link
          to="/"
          className="
          text-brand
          mt-5
          inline-block
          "
          >
            Back Home
          </Link>


        </div>

      </PageShell>

    );

  }



  return (

    <PageShell>


      <div className="
      max-w-7xl
      mx-auto
      px-4
      py-8
      space-y-6
      ">



        {/* HEADER */}

        <div className="
        flex
        items-center
        gap-3
        ">


          <div className="
          h-12
          w-12
          rounded-xl
          bg-gradient-brand
          grid
          place-items-center
          ">

            <Shield className="
            text-white
            h-6
            w-6
            "/>

          </div>


          <div>

            <h1 className="
            text-3xl
            font-bold
            ">
              Admin Dashboard
            </h1>


            <p className="
            text-sm
            text-muted-foreground
            ">
              {user.email}
              {" • "}
              {isOwner ? "Owner":"Moderator"}
            </p>


          </div>


        </div>





        {/* HORIZONTAL NAVBAR */}


        <nav className="
        glass
        rounded-2xl
        p-3
        flex
        flex-wrap
        gap-2
        ">


          <NavButton
          active={section==="dashboard"}
          onClick={()=>setSection("dashboard")}
          icon={<BarChart3 size={18}/>}
          text="Dashboard"
          />


          <Link
          to="/tournaments"
          className="
          flex
          items-center
          gap-2
          px-4
          py-2
          rounded-lg
          hover:bg-accent
          "
          >

            <Trophy size={18}/>
            Tournaments

          </Link>




          <NavButton
          active={section==="players"}
          onClick={()=>setSection("players")}
          icon={<Users size={18}/>}
          text="Players"
          />



          <NavButton
          active={section==="settings"}
          onClick={()=>setSection("settings")}
          icon={<Settings size={18}/>}
          text="Settings"
          />



        </nav>






        {/* CONTENT */}


        <main className="
        glass
        rounded-2xl
        p-6
        ">



        {
        section==="dashboard" &&

        <DashboardOverview/>
        }



        {
        section==="players" &&

        <UsersPanel/>
        }



        {
        section==="settings" &&

        <SiteSettingsPanel/>
        }



        </main>



      </div>


    </PageShell>

  );

}





function DashboardOverview(){


return (

<div className="space-y-6">


<h2 className="
text-2xl
font-bold
">

Overview

</h2>



<div className="
grid
md:grid-cols-4
gap-4
">



<Card
icon={<Users/>}
title="Total Members"
value="0"
/>


<Card
icon={<TrendingUp/>}
title="Growth"
value="0%"
/>


<Card
icon={<Trophy/>}
title="Tournaments"
value="0"
/>


<Card
icon={<BarChart3/>}
title="Live Tournaments"
value="0"
/>



</div>




<div className="
grid
md:grid-cols-2
gap-5
">


<div className="
border
rounded-xl
h-64
grid
place-items-center
text-muted-foreground
">

Members Growth Graph

</div>



<div className="
border
rounded-xl
h-64
grid
place-items-center
text-muted-foreground
">

Tournament Analytics

</div>



</div>


</div>

)

}





function Card({
icon,
title,
value
}:{
icon:React.ReactNode;
title:string;
value:string;
}){


return (

<div className="
border
rounded-xl
p-5
">


<div className="
mb-3
">

{icon}

</div>


<p className="
text-sm
text-muted-foreground
">

{title}

</p>


<h3 className="
text-3xl
font-bold
">

{value}

</h3>


</div>


)

}





function NavButton({
active,
onClick,
icon,
text
}:{
active:boolean;
onClick:()=>void;
icon:React.ReactNode;
text:string;
}){


return (

<button
onClick={onClick}
className={`
flex
items-center
gap-2
px-4
py-2
rounded-lg
transition
${active
?"bg-primary text-primary-foreground"
:"hover:bg-accent"}
`}
>

{icon}

{text}

</button>

)

}
