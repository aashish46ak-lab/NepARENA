import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";


export const Route = createFileRoute("/auth/verify")({
  ssr:false,
  component: VerifyPage,
});


function VerifyPage(){

  const router = useRouter();

  const [otp,setOtp] = useState("");

  const email = sessionStorage.getItem(
    "efn-otp-email"
  );


  const verifyOTP = async()=>{

    if(!email){
      toast.error("Email not found");
      return;
    }


    const {error} = await supabase.auth.verifyOtp({

      email: email,

      token: otp,

      type:"email",

    });


    if(error){

      toast.error(error.message);

      return;

    }


    toast.success("Login successful");


    router.navigate({
      to:"/",
    });

  };


  return(

    <div className="min-h-screen flex items-center justify-center">

      <div className="space-y-4 w-80">

        <h1 className="text-2xl font-bold">
          Enter OTP
        </h1>


        <input
          className="border p-3 w-full rounded"
          placeholder="6 digit code"
          value={otp}
          onChange={(e)=>setOtp(e.target.value)}
        />


        <button
          className="bg-black text-white p-3 w-full rounded"
          onClick={verifyOTP}
        >
          Verify OTP
        </button>


      </div>

    </div>

  );

}
