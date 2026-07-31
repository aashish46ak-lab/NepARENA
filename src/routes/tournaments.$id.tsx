import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useEffect, useState } from "react";

import {
  Trophy,
  Calendar,
  Users,
  ShieldAlert,
  List,
  Table2,
  FileText,
} from "lucide-react";

import { supabase } from "@/lib/supabase";



export const Route = createFileRoute("/tournaments/$id")({
  component: TournamentDetailPage,
});



function TournamentDetailPage(){

  const { id } = Route.useParams();


  const [tournament,setTournament] = useState<any>(null);
  const [matches,setMatches] = useState<any[]>([]);
  const [standings,setStandings] = useState<any[]>([]);
  const [tab,setTab] = useState("standing");


  useEffect(()=>{

    loadTournament();

  },[]);



  async function loadTournament(){

    const {data:t} =
      await supabase
      .from("tournaments")
      .select("*")
      .eq("id",id)
      .single();


    setTournament(t);



    const {data:m} =
      await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id",id)
      .order("round");


    setMatches(m ?? []);



    const {data:s} =
      await supabase
      .from("tournament_standings")
      .select("*")
      .eq("tournament_id",id)
      .order("points",{ascending:false});


    setStandings(s ?? []);

  }




  if(!tournament){

    return (

      <PageShell>

        <div className="
        min-h-[50vh]
        grid
        place-items-center
        ">

          Loading...

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
      py-10
      space-y-6
      ">



        {/* HEADER */}


        <div className="
        glass
        rounded-3xl
        p-6
        ">


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

              <Trophy className="
              text-white
              "/>

            </div>


            <div>

              <h1 className="
              text-3xl
              font-bold
              ">

                {tournament.name}

              </h1>


              <p className="
              text-muted-foreground
              ">

                {tournament.description}

              </p>

            </div>


          </div>


        </div>







        {/* SUB NAV */}


        <div className="
        glass
        rounded-2xl
        p-3
        flex
        flex-wrap
        gap-2
        ">


          <Tab
          active={tab==="overview"}
          text="Overview"
          onClick={()=>setTab("overview")}
          />


          <Tab
          active={tab==="standing"}
          text="Standing"
          icon={<Table2 size={16}/>}
          onClick={()=>setTab("standing")}
          />


          <Tab
          active={tab==="fixture"}
          text="Fixture"
          icon={<List size={16}/>}
          onClick={()=>setTab("fixture")}
          />


          <Tab
          active={tab==="rules"}
          text="Rules"
          icon={<FileText size={16}/>}
          onClick={()=>setTab("rules")}
          />


          <Tab
          active={tab==="report"}
          text="Report Opponent"
          icon={<ShieldAlert size={16}/>}
          onClick={()=>setTab("report")}
          />


        </div>







        {/* CONTENT */}



        <div className="
        glass
        rounded-2xl
        p-6
        ">



        {
        tab==="overview" && (

          <div className="
          grid
          md:grid-cols-3
          gap-4
          ">


            <Info
            icon={<Users/>}
            title="Players"
            value={tournament.participants_count}
            />


            <Info
            icon={<Calendar/>}
            title="Start"
            value={
              tournament.starts_at
              ?
              new Date(tournament.starts_at)
              .toLocaleDateString()
              :
              "-"
            }
            />


            <Info
            icon={<Trophy/>}
            title="Prize"
            value={tournament.prize_pool || "-"}
            />


          </div>

        )
        }






        {
        tab==="standing" && (

          <div>

            <h2 className="
            text-xl
            font-bold
            mb-5
            ">
              Tournament Standing
            </h2>



            <div className="
            overflow-x-auto
            ">


            <table className="
            w-full
            border
            ">

              <thead>

                <tr className="border">

                  <th className="p-3">
                    Player
                  </th>

                  <th>
                    MP
                  </th>

                  <th>
                    W
                  </th>

                  <th>
                    D
                  </th>

                  <th>
                    L
                  </th>

                  <th>
                    PTS
                  </th>

                </tr>

              </thead>


              <tbody>


              {
              standings.map((s)=>(

                <tr
                key={s.id}
                className="border"
                >

                  <td className="p-3">
                    {s.player_name}
                  </td>

                  <td>
                    {s.played}
                  </td>

                  <td>
                    {s.wins}
                  </td>

                  <td>
                    {s.draws}
                  </td>

                  <td>
                    {s.losses}
                  </td>

                  <td>
                    {s.points}
                  </td>


                </tr>


              ))
              }


              </tbody>


            </table>


            </div>


          </div>

        )
        }







        {
        tab==="fixture" && (

          <div className="space-y-3">


          {
          matches.map((m)=>(

            <div
            key={m.id}
            className="
            border
            rounded-xl
            p-4
            flex
            justify-between
            "
            >

              <span>
                {m.home_id}
              </span>


              <b>
                {
                m.played
                ?
                `${m.home_score} - ${m.away_score}`
                :
                "VS"
                }
              </b>


              <span>
                {m.away_id}
              </span>


            </div>

          ))
          }


          </div>

        )
        }







        {
        tab==="rules" && (

          <p>
            Tournament rules will be displayed here.
          </p>

        )
        }





        {
        tab==="report" && (

          <div>


            <h2 className="
            font-bold
            text-xl
            mb-3
            ">
              Report Your Opponent
            </h2>


            <textarea
            className="
            w-full
            rounded-xl
            border
            p-3
            "
            placeholder="
            Explain your issue...
            "
            />


            <button
            className="
            mt-3
            px-5
            py-2
            rounded-lg
            bg-primary
            text-primary-foreground
            "
            >

              Submit Report

            </button>


          </div>

        )
        }





        </div>



      </div>


    </PageShell>

  );

}





function Tab({
active,
text,
icon,
onClick
}:any){

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




function Info({
icon,
title,
value
}:any){

return (

<div className="
border
rounded-xl
p-5
">

{icon}

<p className="
text-sm
text-muted-foreground
mt-2
">
{title}
</p>

<h3 className="
font-bold
text-xl
">
{value}
</h3>

</div>

)

}
