import { h } from "preact";

export const config = {
  method: "get",
  title: "Home"
}

export default function Home()
{
  return (
    <div>
      <h1>Hey</h1>
      <h2>Welcome to spotifio</h2>
      <p>We help you track your spotify playlists. :)</p>
    </div>
  );
}