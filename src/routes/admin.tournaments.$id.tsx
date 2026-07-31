import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/PageShell";
import { useTournaments } from "@/hooks/useContent";
import { TournamentManager } from "@/components/tournament-manager/TournamentManager";
import { Loader2 } from "lucide-react";


export const Route = createFileRoute("/admin/tournaments/$id")({
  ssr:false,
  component: AdminTournamentPage,
});


function AdminTournamentPage(){

  const { id } = Route.useParams();

  const {
    data:tournaments=[],
    isLoading
  } = useTournaments();


  const tournament =
    tournaments.find(
      t=>t.id===id
    );



  if(isLoading){

    return (

      <PageShell>

        <div className="
        min-h-[50vh]
        grid
        place-items-center
        ">

          <Loader2 className="
          animate-spin
          "/>

        </div>

      </PageShell>

    );

  }



  if(!tournament){

    return (

      <PageShell>

        <div className="
        py-20
        text-center
        ">

          Tournament not found

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
      ">


        <TournamentManager

          tournament={tournament}

          open={true}

          onOpenChange={()=>{}}

        />


      </div>


    </PageShell>

  );

}
