import type { ReactNode } from "react";

export function AdminSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="w-full">
      <div
        className="
        glass
        rounded-3xl
        border
        border-border/60
        p-4
        sm:p-6
        shadow-lg
        "
      >

        <div className="
          flex
          flex-col
          sm:flex-row
          sm:items-center
          justify-between
          gap-4
          mb-6
        ">

          <div>
            <h2 className="
              text-xl
              font-bold
              tracking-tight
            ">
              {title}
            </h2>

            {description && (
              <p className="
                text-sm
                text-muted-foreground
                mt-1
              ">
                {description}
              </p>
            )}

          </div>


          {action && (
            <div className="shrink-0">
              {action}
            </div>
          )}

        </div>


        {children}

      </div>
    </section>
  );
}



export function EmptyState({
  message,
}:{
  message:string;
}){

return (

<div
className="
rounded-2xl
border
border-dashed
border-border/60
p-10
text-center
text-sm
text-muted-foreground
"
>

{message}

</div>

);

}
