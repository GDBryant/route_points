import { Link } from "react-router-dom";

const CONTACT = "info@roamingsolutions.net";
const UPDATED = "17 October 2026";

export function PrivacyPage() {
  return (
    <div className="page legal">
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated {UPDATED}</p>
      <h2>Who we are</h2>
      <p>
        Route Points (also "Route Point Adventures") is operated by Roaming
        Solutions and available at rpa.roamingsolutions.net. Contact: {CONTACT}.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>
          Account: email address; and, if you sign in with Google, your Google
          account email, name and profile picture.
        </li>
        <li>Profile: the display name and marker colour you choose.</li>
        <li>
          Content you create: adventures, named points, recorded routes and GPX
          files you import.
        </li>
        <li>
          Location: your device's GPS position while the app is open, used to
          show you on the map, record routes and, if you enable "Share my
          position", to show your live position to other members of the same
          adventure. Recent positions are stored for up to 10 minutes for this
          purpose.
        </li>
        <li>
          Technical: standard server logs (IP address, browser type, timestamps)
          kept by our hosting providers.
        </li>
      </ul>
      <h2>How we use it</h2>
      <p>
        Only to provide the service: authentication, showing and syncing points,
        routes and live positions between members of an adventure. We do not
        sell data, run ads or use it for profiling.
      </p>
      <h2>Who can see your data</h2>
      <p>
        Members of an adventure can see its points, routes and the display names
        and live positions of other members. Anyone with an adventure's share
        link can view its points and routes read-only. Only share links with
        people you trust.
      </p>
      <h2>Processors</h2>
      <p>
        Supabase (database, authentication, realtime; EU region), Cloudflare
        (hosting), Google (optional sign-in), OpenStreetMap and Esri (map
        tiles). Map tile requests send your IP address and the map area you view
        to those providers.
      </p>
      <h2>Offline storage</h2>
      <p>
        The app stores your adventures, points, routes and downloaded map tiles
        in your browser (IndexedDB / cache) so it works offline. Clearing site
        data removes them.
      </p>
      <h2>Retention and deletion</h2>
      <p>
        Adventures unopened for 60 days, and accounts inactive for 60 days that
        own no adventures, are deleted automatically (see Terms). Delete points,
        routes and adventures in the app at any time. To delete your account and
        all associated data, email {CONTACT}.
      </p>
      <h2>Your rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal
        data by emailing {CONTACT}.
      </p>
      <h2>Changes</h2>
      <p>
        We will update this page when the policy changes; the date above shows
        the current version.
      </p>
      <p>
        <Link to="/terms">Terms of Service</Link> · <Link to="/">Home</Link>
      </p>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="page legal">
      <h1>Terms of Service</h1>
      <p className="muted">Last updated {UPDATED}</p>
      <h2>The service</h2>
      <p>
        Route Points lets you log location points and GPS routes for off-road
        adventures and share them with others. It is provided free of charge,
        "as is", by Roaming Solutions.
      </p>
      <h2>Your account</h2>
      <p>
        You are responsible for activity under your account and for anyone you
        give a share link to. You must be at least 16 years old to create an
        account.
      </p>
      <h2>Your content</h2>
      <p>
        You own the points, routes and files you create. You grant us the right
        to store and display them to deliver the service. Do not upload content
        that is unlawful or that you have no right to share.
      </p>
      <h2>Safety</h2>
      <p>
        Route Points is a logging and navigation aid, not a safety system. GPS
        positions, recorded routes and map data can be inaccurate, outdated or
        unavailable (no signal, offline, device limits). Always use your own
        judgement, local knowledge and appropriate safety equipment. Driving
        off-road is at your own risk.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Do not misuse the service, attempt to access other users' data, or place
        excessive load on it (for example bulk tile downloads beyond the in-app
        limits).
      </p>
      <h2>Inactivity</h2>
      <p>
        Adventures that no member has opened for 60 days are deleted, together
        with their points, routes and positions. Accounts that have not signed
        in or opened an adventure for 60 days, and own no remaining adventures,
        are deleted. This is automatic and permanent; export GPX before an event
        if you want to keep a record.
      </p>
      <h2>Availability</h2>
      <p>
        We may change, suspend or discontinue the service at any time without
        notice. Back up important data using GPX export.
      </p>
      <h2>Liability</h2>
      <p>
        To the fullest extent permitted by law, Roaming Solutions is not liable
        for any loss, injury or damage arising from use of or reliance on the
        service.
      </p>
      <h2>Contact</h2>
      <p>{CONTACT}</p>
      <p>
        <Link to="/privacy">Privacy Policy</Link> · <Link to="/">Home</Link>
      </p>
    </div>
  );
}
