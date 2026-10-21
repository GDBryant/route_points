import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  createAdventure,
  deleteAdventure,
  listAdventures,
  type Adventure,
} from "./api";
import ShareSheet from "./ShareSheet";
import InstallHint from "@/features/pwa/InstallHint";
import AboutUpdate from "@/features/pwa/AboutUpdate";
import { useAuth } from "@/features/auth/useAuth";

export default function AdventuresPage() {
  const [adventures, setAdventures] = useState<Adventure[]>([]);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [share, setShare] = useState<Adventure | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    listAdventures()
      .then(setAdventures)
      .catch((e) => setError(e.message));
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = await createAdventure(name).catch((err: Error) => {
      setError(err.message);
      return null;
    });
    if (id) navigate(`/a/${id}`);
  };

  const remove = async (a: Adventure) => {
    if (!confirm(`Delete "${a.name}" and all its points and routes?`)) return;
    const err = await deleteAdventure(a.id)
      .then(() => null)
      .catch((e: Error) => e.message as string);
    if (err) return setError(err);
    setAdventures((list) => list.filter((x) => x.id !== a.id));
  };

  return (
    <div className="page">
      <h1>Adventures</h1>
      {error && <p className="error">{error}</p>}
      <ul className="list">
        {adventures.map((a, i) => (
          <li key={a.id} className={i === 0 ? "card latest" : "card"}>
            <Link to={`/a/${a.id}`}>
              <strong>{a.name}</strong>
              <span className="muted"> · {a.role}</span>
            </Link>
            <button onClick={() => setShare(a)}>Share</button>
            {a.role === "owner" && (
              <button className="danger" onClick={() => remove(a)}>
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
      {creating ? (
        <form onSubmit={create} className="stack bottom-actions">
          <input
            autoFocus
            required
            placeholder="Adventure name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button type="submit" className="primary">
            Create
          </button>
          <button type="button" onClick={() => setCreating(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="bottom-actions">
          <button className="primary" onClick={() => setCreating(true)}>
            Start New Adventure
          </button>
        </div>
      )}
      {share && (
        <ShareSheet
          token={share.share_token}
          name={share.name}
          onClose={() => setShare(null)}
        />
      )}
      <div style={{ marginTop: 16 }}>
        <InstallHint />
        <AboutUpdate />
        <p className="muted">Logged in as {user?.email}</p>
      </div>
      <button
        className="signout"
        onClick={() => signOut().then(() => navigate("/", { replace: true }))}
      >
        Sign out
      </button>
    </div>
  );
}
