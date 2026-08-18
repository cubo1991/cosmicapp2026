
import JoinMatch from "../../sections/JoinMatch";
import { use } from "react";


export default  function CargarPartida(props: { params: Promise<{ id: string }> }) {

  const { id } = use(props.params);

  return (
    <div>
      <main>
        <JoinMatch matchId={id} />
      </main>
    </div>
  );
}