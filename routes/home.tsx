import { h } from "preact";

export const config = {
  method: "get",
  title: "Home"
}

export default function Home()
{
  return (
    <div>
      <h1>Hello world!</h1>
    </div>
  );
}