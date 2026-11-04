import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy · Worldesk",
  description: "What Worldesk collects, why, who it is shared with, and how to have it deleted.",
};

const CONTACT = "kailin.xu.2026@marshall.usc.edu";
const UPDATED = "November 4, 2026";

// Keep this page in step with the app: every statement here describes what the code does today.
export default function PrivacyPage() {
  return (
    <main className="wrap privacy">
      <header className="mast">
        <a className="wordmark" href="/">Worl<span>desk</span></a>
        <div className="mast-meta">Updated {UPDATED}</div>
      </header>

      <h1>Privacy</h1>
      <p className="privacy-lead">
        Worldesk is a student prototype from a course at the University of Southern California. It is not a
        commercial service. This page explains what it collects, why, and how to have it deleted.
      </p>

      <h2>What we collect</h2>
      <h3>When you sign in with Google</h3>
      <p>Your name, email address and profile picture. Worldesk can&apos;t read your Gmail, contacts or files.</p>
      <h3>When you set up your briefing</h3>
      <p>Your job title, function, industry, company if you add it, and the markets, topics and keywords you choose.</p>
      <h3>When you use Worldesk</h3>
      <ul>
        <li>Stories you save and your alert settings.</li>
        <li>How many searches your account ran that day, so we can apply a daily limit.</li>
        <li>
          What you do while signed in, recorded with your account ID: how long onboarding took, when you open your
          briefing, how long it takes to load, your active time on the page, and the stories, source links, markets and
          topics you click or save. For stories we record only the outlet, market and topic, not the headline or article.
          We don&apos;t record your screen or what you type. Nothing like this is recorded before you sign in or when you view the sample.
        </li>
        <li>
          Your browser also keeps stories you have seen and recent results so pages load faster. Signing out clears
          this, apart from saved economic figures, which contain nothing about you.
        </li>
      </ul>
      <h3>If you answer the feedback survey</h3>
      <ul>
        <li>Your answers, and your comments or email address if you choose to add them.</li>
        <li>Your role, industry and markets, only if you tick the box to include them.</li>
        <li>How long the survey took, your device type (desktop or mobile), and a scrambled version of your network address used to limit repeat submissions.</li>
        <li>Whether you were invited to the survey, started it, and which steps you reached, recorded with your account ID, or a random ID on the sample.</li>
      </ul>
      <p>
        <strong>Your survey answers are linked to your account</strong>, so that you have one response and can edit it
        from any device. This means they aren&apos;t anonymous to us. The spreadsheet we use to study the results leaves
        out your account ID, but it does include any email or comments you added.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To choose and rank the stories in your briefing.</li>
        <li>To keep your profile and saved stories available when you sign in.</li>
        <li>To understand what readers think of Worldesk and decide what to build next.</li>
        <li>To limit usage, because each search has a real cost.</li>
        <li>To measure how people use Worldesk, such as active readers per week and which features get used, and to report totals in our course presentation.</li>
      </ul>
      <p>We don&apos;t sell your information, show advertising, or ask for your contacts.</p>

      <h2>Who else handles it</h2>
      <ul>
        <li><strong>Google</strong> confirms who you are when you sign in.</li>
        <li><strong>Neon</strong> stores your account and data, on servers in the United States.</li>
        <li><strong>Vercel</strong> hosts the website and may keep technical logs of requests, including network addresses.</li>
        <li>
          <strong>Perplexity</strong> runs the news searches and the AI model that writes your briefing. It receives your job
          title, function, company, industry, market, topics and keywords, but not your name or email.
          Don&apos;t put anything confidential in your company or keyword fields.
        </li>
      </ul>
      <p>
        Worldesk&apos;s use of information received from Google APIs follows the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>,
        including its Limited Use requirements.
      </p>

      <h2>The sample executive</h2>
      <p>
        You can view the sample without an account. If you answer the survey there, your answers are marked as coming from
        the sample, and your browser keeps a private key so you can edit them.
      </p>

      <h2>Keeping and deleting your data</h2>
      <p>
        We keep your data until you ask us to delete it. To have your account and your personal data deleted, email{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the address you signed in with.
      </p>

      <h2>Changes and questions</h2>
      <p>
        If this page changes, the date at the top will change too. For any question, email{" "}
        <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <p className="privacy-back"><a href="/">Back to Worldesk</a></p>
    </main>
  );
}
