import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import WorkoutTab from './components/workout/WorkoutTab';
import HistoryTab from './components/history/HistoryTab';
import NutritionTab from './components/nutrition/NutritionTab';
import ProgressTab from './components/progress/ProgressTab';
import { WorkoutProvider } from './context/WorkoutContext';
import { pullFromCloud } from './utils/cloudSync';
import { runExerciseIdMigration } from './utils/exerciseIdMigration';
import { runDataFixes } from './utils/dataFixes';

// Run once at startup — migrates old exercise IDs to new focus-labeled IDs
runExerciseIdMigration();
// Run once at startup — corrects any known bad data entries
runDataFixes();

export default function App() {
  const [activeTab, setActiveTab] = useState('today');
  const [syncStatus, setSyncStatus] = useState('syncing');

  useEffect(() => {
    setSyncStatus('syncing');
    pullFromCloud().then(success => {
      setSyncStatus(success ? 'synced' : 'offline');
      // After 3 seconds, hide the synced indicator
      if (success) setTimeout(() => setSyncStatus('idle'), 3000);
    });
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'today': return <WorkoutTab />;
      case 'history': return <HistoryTab />;
      case 'nutrition': return <NutritionTab />;
      case 'progress': return <ProgressTab />;
      default: return <WorkoutTab />;
    }
  };

  return (
    <WorkoutProvider>
      <Layout activeTab={activeTab} onTabChange={setActiveTab} syncStatus={syncStatus}>
        {renderTab()}
      </Layout>
    </WorkoutProvider>
  );
}
