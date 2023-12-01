import Link from "next/link";
import Head from "next/head";

export const Layout = (props) => {
  return (
    <div
      style={{
        margin: "3rem",
      }}
    >
      <Head>
        <link rel="stylesheet" href="/style.css" />
        <title>
          {props.title ? `${props.title} | ` : ""}Structured Thoughts Blog
        </title>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
      </Head>
      <div className="main-wrapper">
        <header>
          <h1>
            The <i>Structured Thoughts</i> Blog
          </h1>

          <div className="nav">
            <Link href="/">
              <a>Posts</a>
            </Link>
            {" | "}
            <Link href="/about">
              <a>About</a>
            </Link>
          </div>
        </header>

        <main>{props.children}</main>
      </div>
    </div>
  );
};
