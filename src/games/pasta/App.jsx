import VNApp from '../../engine/vn/VNApp.jsx';
import { cfg, st } from './game/story.js';

export default function App() {
  return <VNApp cfg={cfg} st={st} />;
}
