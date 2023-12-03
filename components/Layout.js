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
      <header className="band">
        <div className="wrapper">
          <h1 className="site-title">
            <a href="/">
              <img src="/structured-thoughts-53x42.png" />
            </a>
            <a href="/">
              The <i>Structured Thoughts</i> Blog
            </a>
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

      <footer className="band">
        <div className="wrapper">
          <small>
            If you like what you're reading and you want to show your
            appreciation, you can{" "}
            <a href="https://ko-fi.com/thestructuredthoughtsblog">
              support me on ko-fi
            </a>
            .
          </small>
        </div>
      </footer>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            LUX=function(){function n(){return Date.now?Date.now():+new Date}var r,e=n(),t=window.performance||{},a=t.timing||{navigationStart:(null===(r=window.LUX)||void 0===r?void 0:r.ns)||e};function o(){return t.now?(r=t.now(),Math.floor(r)):n()-a.navigationStart;var r}(LUX=window.LUX||{}).ac=[],LUX.addData=function(n,r){return LUX.cmd(["addData",n,r])},LUX.cmd=function(n){return LUX.ac.push(n)},LUX.getDebug=function(){return[[e,0,[]]]},LUX.init=function(){return LUX.cmd(["init"])},LUX.mark=function(){for(var n=[],r=0;r<arguments.length;r++)n[r]=arguments[r];if(t.mark)return t.mark.apply(t,n);var e=n[0],a=n[1]||{};void 0===a.startTime&&(a.startTime=o());LUX.cmd(["mark",e,a])},LUX.markLoadTime=function(){return LUX.cmd(["markLoadTime",o()])},LUX.measure=function(){for(var n=[],r=0;r<arguments.length;r++)n[r]=arguments[r];if(t.measure)return t.measure.apply(t,n);var e,a=n[0],i=n[1],u=n[2];e="object"==typeof i?n[1]:{start:i,end:u};e.duration||e.end||(e.end=o());LUX.cmd(["measure",a,e])},LUX.send=function(){return LUX.cmd(["send"])},LUX.ns=e;var i=LUX;if(window.LUX_ae=[],window.addEventListener("error",(function(n){window.LUX_ae.push(n)})),window.LUX_al=[],"function"==typeof PerformanceObserver&&"function"==typeof PerformanceLongTaskTiming){var u=new PerformanceObserver((function(n){for(var r=n.getEntries(),e=0;e<r.length;e++)window.LUX_al.push(r[e])}));try{u.observe({type:"longtask"})}catch(n){}}return i}();
            LUX.minMeasureTime = 5000;
            LUX.beaconUrl = "https://lux-dev.speedcurve.com/lux/";
            LUX.errorBeaconUrl = "https://lux-dev.speedcurve.com/error/";
        `,
        }}
      ></script>
      <script
        src="https://cdn.speedcurve.com/js/lux.js?id=73376842"
        defer
        crossOrigin="anonymous"
      ></script>
    </>
  );
};
