import { TeamChannels } from '@/components/chat/TeamChannels';

export const metadata = {
  title: 'Team Channels | EzEv Operations',
  description: 'Role-based group chat channels for Operations, Mechanics, and Hub Managers',
};

export default function ChannelsPage() {
  return <TeamChannels />;
}
