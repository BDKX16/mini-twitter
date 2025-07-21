import { Profile } from "@/components/Profile";

interface ProfilePageProps {
  params: {
    username: string;
  };
}

export default function UserProfilePage({ params }: ProfilePageProps) {
  return <Profile username={params.username} />;
}
