
import JoinMatch from "../../sections/JoinMatch";
import { use } from "react";


export default  function CargarPartida(props) {
  
  const { id } = use(props.params);

  return (
    <div>
      <main>
        <JoinMatch matchId={id} />
      </main>
    </div>
  );
}