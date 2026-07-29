import Link from "next/link";
import { FeedArt } from "@/components/FeedArt";
import {
  ArrowRightIcon,
  InfoIcon,
  RssIcon,
  SettingsIcon,
  SparkleIcon,
} from "@/components/icons";

export default function HomePage() {
  return (
    <div className="view">
      <header className="view-head">
        <p className="view-kicker">
          <SparkleIcon />
          Home
        </p>
        <h1 className="sr-only">Home</h1>
        <p className="view-lead">
          An RSS server console for authoring and categorising announcement posts.
        </p>
      </header>

      <div className="view-body home-grid">
        <Link href="/feeds" className="feature-card feature-lg">
          <div className="feature-lg-body">
            <span className="feature-icon">
              <RssIcon />
            </span>
            <div className="feature-text">
              <p className="feature-eyebrow">Primary view</p>
              <h2 className="feature-title">Feeds / Posts</h2>
              <p className="feature-copy">
                Author, categorise, search, and open the RSS posts this server
                publishes — each with its own detail view.
              </p>
            </div>
            <span className="feature-cta">
              Open posts
              <ArrowRightIcon />
            </span>
          </div>
          <div className="feature-art" aria-hidden="true">
            <FeedArt />
          </div>
        </Link>

        <div className="home-row">
          <Link href="/about" className="feature-card">
            <span className="feature-icon">
              <InfoIcon />
            </span>
            <div className="feature-text">
              <h2 className="feature-title">About</h2>
              <p className="feature-copy">
                Project scope, student details, and how to use the site.
              </p>
            </div>
            <ArrowRightIcon className="feature-arrow" />
          </Link>

          <Link href="/settings" className="feature-card">
            <span className="feature-icon">
              <SettingsIcon />
            </span>
            <div className="feature-text">
              <h2 className="feature-title">Settings</h2>
              <p className="feature-copy">
                Switch theme and compact list preferences — saved for next time.
              </p>
            </div>
            <ArrowRightIcon className="feature-arrow" />
          </Link>
        </div>
      </div>
    </div>
  );
}
