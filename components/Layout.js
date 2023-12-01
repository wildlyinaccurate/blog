import Link from "next/link";
import Head from "next/head";

export const Layout = (props) => {
  return (
    <>
      <Head>
        <title>
          {props.title ? `${props.title} | ` : ""}The Structured Thoughts Blog
        </title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <link rel="stylesheet" href="/style.css" />
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
      <header>
        <div className="wrapper">
          <h1 className="site-title">
            <img src="structured-thoughts-53x42.png" />
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
        </div>
      </header>

      <div className="wrapper">
        <main>{props.children}</main>
      </div>
    </>
  );
};
