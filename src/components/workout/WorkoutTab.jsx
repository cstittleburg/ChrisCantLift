import { useWorkout } from '../../context/WorkoutContext';
import WorkoutSession from './WorkoutSession';
import WorkoutHome from './WorkoutHome';

export default function WorkoutTab() {
  const { activeSession } = useWorkout();

  if (activeSession) {
    return <WorkoutSession />;
  }
  return <WorkoutHome />;
}
