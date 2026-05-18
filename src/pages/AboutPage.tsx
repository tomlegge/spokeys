import { Link } from "react-router-dom";

export default function AboutPage() {
  return (
    <div className="about-page">
      <h1>About the Spokeys</h1>
      <p>
        We're a group of friends who ride bikes together. This site is a
        living archive of the routes we've taken.
      </p>
      <p>
        Want to see who's racked up the most miles? Head to the{" "}
        <Link to="/stats">stats page</Link>.
      </p>

      <h2>Adding a new ride</h2>
      <ol>
        <li>
          Save your GPX or KML route to <code>public/rides/</code> in this
          repo.
        </li>
        <li>
          (Optional) Add photos to{" "}
          <code>public/photos/&lt;ride-slug&gt;/</code>.
        </li>
        <li>
          Open <code>src/data/rides.ts</code> and append a new entry with the
          file path, date, riders, and a short description.
        </li>
        <li>
          Commit and push — GitHub Actions builds and publishes to GitHub
          Pages automatically.
        </li>
      </ol>
    </div>
  );
}
