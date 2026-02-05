import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="relative w-full flex md:items-center md:justify-center bg-white/96 dark:bg-black/[0.96] antialiased min-h-[40rem] md:min-h-[50rem] lg:min-h-[40rem]">
      {/* Spotlight effect */}
      <svg
        className="animate-spotlight pointer-events-none absolute z-[1] h-[169%] w-[138%] lg:w-[84%] opacity-0"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 3787 2842"
        fill="none"
      >
        <g filter="url(#filter)">
          <ellipse
            cx="1924.71"
            cy="273.501"
            rx="1924.71"
            ry="273.501"
            transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
            fill="white"
            fillOpacity="0.1"
          />
        </g>
        <defs>
          <filter
            id="filter"
            x="0.860352"
            y="0.838989"
            width="3785.16"
            height="2840.26"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="180" result="effect1_foregroundBlur_1065_8" />
          </filter>
        </defs>
      </svg>

      {/* Grid background */}
      <div className="absolute inset-0 left-5 right-5 lg:left-16 lg:right-14 xl:left-16 xl:right-14">
        <div className="absolute inset-0 bg-grid text-muted/50 dark:text-white/[0.02]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
      </div>

      <div className="px-4 py-8 md:w-10/12 mx-auto relative z-10">
        <div className="mx-auto grid lg:max-w-8xl xl:max-w-full grid-cols-1 items-center gap-x-8 gap-y-16 px-4 py-2 lg:grid-cols-2 lg:px-8 lg:py-4 xl:gap-x-16 xl:px-0">
          {/* Left column - Content */}
          <div className="relative z-10 text-left lg:mt-0">
            <div className="relative space-y-4">
              <div className="space-y-2">
                {/* Badge */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-end gap-1 mt-2">
                    <div className="flex items-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="0.8em" height="0.8em" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="M13 4V2c4.66.5 8.33 4.19 8.85 8.85c.6 5.49-3.35 10.43-8.85 11.03v-2c3.64-.45 6.5-3.32 6.96-6.96A7.994 7.994 0 0 0 13 4m-7.33.2A9.8 9.8 0 0 1 11 2v2.06c-1.43.2-2.78.78-3.9 1.68zM2.05 11a9.8 9.8 0 0 1 2.21-5.33L5.69 7.1A8 8 0 0 0 4.05 11zm2.22 7.33A10.04 10.04 0 0 1 2.06 13h2c.18 1.42.75 2.77 1.63 3.9zm1.4 1.41l1.39-1.37h.04c1.13.88 2.48 1.45 3.9 1.63v2c-1.96-.21-3.82-1-5.33-2.26M12 17l1.56-3.42L17 12l-3.44-1.56L12 7l-1.57 3.44L7 12l3.43 1.58z"></path>
                      </svg>
                      <span className="text-xs text-opacity-75">Type-Safe APIs</span>
                    </div>
                  </div>
                </div>

                {/* Title */}
                <h1 className="text-zinc-800 dark:text-zinc-300 tracking-tight text-2xl md:text-3xl text-pretty">
                  The most comprehensive framework for building type-safe APIs with context management.
                </h1>
              </div>

              {/* Installation command */}
              <div className="relative flex items-center gap-2 w-full sm:w-[90%] border border-white/10">
                <div className="relative flex content-center transition duration-500 items-center flex-col flex-nowrap gap-10 h-min justify-center overflow-visible p-px decoration-clone w-full">
                  <div className="z-10 px-4 py-2 rounded-none w-full flex items-center justify-between gap-2">
                    <div className="w-full flex flex-col min-[350px]:flex-row min-[350px]:items-center gap-0.5 min-[350px]:gap-2 min-w-0">
                      <p className="text-xs sm:text-sm font-mono select-none tracking-tighter space-x-1 shrink-0">
                        <span>
                          <span className="text-sky-500">git:</span>
                          <span className="text-red-400">(main)</span>
                        </span>
                        <span className="italic text-amber-600">x</span>
                      </p>
                      <p className="relative inline tracking-tight opacity-90 md:text-sm text-xs dark:text-white font-mono text-black">
                        npm i{' '}
                        <span className="relative dark:text-fuchsia-300 text-fuchsia-800">
                          @deessejs/functions
                          <span className="absolute h-2 bg-gradient-to-tr from-white via-stone-200 to-stone-300 blur-3xl w-full top-0 left-2"></span>
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View @deessejs/functions package on npm"
                        href="https://www.npmjs.com/package/@deessejs/functions"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 128 128" aria-hidden="true">
                          <path fill="#cb3837" d="M0 7.062C0 3.225 3.225 0 7.062 0h113.88c3.838 0 7.063 3.225 7.063 7.062v113.88c0 3.838-3.225 7.063-7.063 7.063H7.062c-3.837 0-7.062-3.225-7.062-7.063zm23.69 97.518h40.395l.05-58.532h19.494l-.05 58.581h19.543l.05-78.075l-78.075-.1l-.1 78.126z"></path>
                          <path fill="#fff" d="M25.105 65.52V26.512H40.96c8.72 0 26.274.034 39.008.075l23.153.075v77.866H83.645v-58.54H64.057v58.54H25.105z"></path>
                        </svg>
                      </a>
                      <a
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View DeesseJS Functions repository on GitHub"
                        href="https://github.com/nesalia-inc/functions"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 256 256" aria-hidden="true">
                          <g fill="none">
                            <rect width="256" height="256" fill="#242938" rx="60"></rect>
                            <path
                              fill="#fff"
                              d="M128.001 30C72.779 30 28 74.77 28 130.001c0 44.183 28.653 81.667 68.387 94.89c4.997.926 6.832-2.169 6.832-4.81c0-2.385-.093-10.262-.136-18.618c-27.82 6.049-33.69-11.799-33.69-11.799c-4.55-11.559-11.104-14.632-11.104-14.632c-9.073-6.207.684-6.079.684-6.079c10.042.705 15.33 10.305 15.33 10.305c8.919 15.288 23.394 10.868 29.1 8.313c.898-6.464 3.489-10.875 6.349-13.372c-22.211-2.529-45.56-11.104-45.56-49.421c0-10.918 3.906-19.839 10.303-26.842c-1.039-2.519-4.462-12.69.968-26.464c0 0 8.398-2.687 27.508 10.25c7.977-2.215 16.531-3.326 25.03-3.364c8.498.038 17.06 1.149 25.051 3.365c19.087-12.939 27.473-10.25 27.473-10.25c5.443 13.773 2.019 23.945.98 26.463c6.412 7.003 10.292 15.924 10.292 26.842c0 38.409-23.394 46.866-45.662 49.341c3.587 3.104 6.783 9.189 6.783 18.519c0 13.38-.116 24.149-.116 27.443c0 2.661 1.8 5.779 6.869 4.797C199.383 211.64 228 174.169 228 130.001C228 74.771 183.227 30 128.001 30M65.454 172.453c-.22.497-1.002.646-1.714.305c-.726-.326-1.133-1.004-.898-1.502c.215-.512.999-.654 1.722-.311c.727.326 1.141 1.01.89 1.508m4.919 4.389c-.477.443-1.41.237-2.042-.462c-.654-.697-.777-1.629-.293-2.078c.491-.442 1.396-.235 2.051.462c.654.706.782 1.631.284 2.078m3.374 5.616c-.613.426-1.615.027-2.234-.863c-.613-.889-.613-1.955.013-2.383c.621-.427 1.608-.043 2.236.84c.611.904.611 1.971-.015 2.406m5.707 6.504c-.548.604-1.715.442-2.57-.383c-.874-.806-1.118-1.95-.568-2.555c.555-.606 1.729-.435 2.59.383c.868.804 1.133 1.957.548 2.555m7.376 2.195c-.242.784-1.366 1.14-2.499.807c-1.13-.343-1.871-1.26-1.642-2.052c.235-.788 1.364-1.159 2.505-.803c1.13.341 1.871 1.252 1.636 2.048m8.394.932c.028.824-.932 1.508-2.121 1.523c-1.196.027-2.163-.641-2.176-1.452c0-.833.939-1.51 2.134-1.53c1.19-.023 2.163.639 2.163 1.459m8.246-.316c.143.804-.683 1.631-1.864 1.851c-1.161.212-2.236-.285-2.383-1.083c-.144-.825.697-1.651 1.856-1.865c1.183-.205 2.241.279 2.391 1.097"
                            ></path>
                          </g>
                        </svg>
                      </a>
                    </div>
                  </div>
                  <div className="flex-none inset-0 overflow-hidden absolute z-0 rounded-none bg-gradient-to-tl dark:from-amber-100/30 dark:via-zinc-900 dark:to-black blur-md opacity-50"></div>
                  <div className="bg-zinc-100 dark:bg-zinc-950 absolute z-1 flex-none inset-[2px] "></div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex w-fit flex-col gap-4 font-sans md:flex-row md:justify-center lg:justify-start items-center">
                <Link
                  className="hover:shadow-sm dark:border-stone-100 dark:hover:shadow-sm border-2 border-black bg-white px-4 py-1.5 text-sm uppercase text-black shadow-[1px_1px_rgba(0,0,0),2px_2px_rgba(0,0,0),3px_3px_rgba(0,0,0),4px_4px_rgba(0,0,0),5px_5px_0px_0px_rgba(0,0,0)] transition duration-200 md:px-8 dark:shadow-[1px_1px_rgba(255,255,255),2px_2px_rgba(255,255,255),3px_3px_rgba(255,255,255),4px_4px_rgba(255,255,255),5px_5px_0px_0px_rgba(255,255,255)]"
                  href="/docs"
                >
                  Get Started
                </Link>
                <Link
                  className="bg-stone-950 no-underline group cursor-pointer relative p-px text-xs font-semibold leading-6 text-white md:inline-block"
                  href="https://github.com/nesalia-inc/functions"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="absolute inset-0 overflow-hidden rounded-sm">
                    <span className="absolute inset-0 rounded-sm bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
                  </span>
                  <div className="relative flex space-x-2 items-center z-10 rounded-none bg-zinc-950 py-2 px-4 ring-1 ring-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                    </svg>
                    <span>View on GitHub</span>
                  </div>
                  <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-stone-800/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40"></span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right column - Code preview */}
          <div className="relative md:block lg:static xl:pl-10">
            <div className="relative">
              <div className="from-sky-300 via-sky-300/70 to-blue-300 absolute inset-0 rounded-none bg-gradient-to-tr opacity-5 blur-lg"></div>
              <div className="from-stone-300 via-stone-300/70 to-blue-300 absolute inset-0 rounded-none bg-gradient-to-tr opacity-5"></div>
              <div className="from-stone-100 to-stone-200 dark:to-black/90 dark:via-black dark:from-stone-950/90 relative overflow-hidden rounded-sm bg-gradient-to-tr ring-1 ring-white/10 backdrop-blur-lg">
                <div>
                  <div className="absolute -top-px left-0 right-0 h-px"></div>
                  <div className="absolute -bottom-px left-11 right-20 h-px"></div>
                  <div className="pl-4 pt-4">
                    <svg aria-hidden="true" viewBox="0 0 42 10" fill="none" className="stroke-slate-500/30 h-2.5 w-auto">
                      <circle cx="5" cy="5" r="4.5"></circle>
                      <circle cx="21" cy="5" r="4.5"></circle>
                      <circle cx="37" cy="5" r="4.5"></circle>
                    </svg>
                    <div className="mt-4 flex space-x-2 text-xs">
                      <button className="relative isolate flex h-6 cursor-pointer items-center justify-center rounded-full px-2.5 text-stone-300">
                        api.ts
                        <div className="bg-stone-800 absolute inset-0 -z-10 rounded-full"></div>
                      </button>
                      <button className="relative isolate flex h-6 cursor-pointer items-center justify-center rounded-full px-2.5 text-slate-500">
                        context.ts
                      </button>
                    </div>
                    <div className="flex flex-col items-start px-1 text-sm">
                      <div className="w-full overflow-x-auto">
                        <div className="relative flex items-center px-1 text-sm min-w-max">
                          <div aria-hidden="true" className="border-slate-300/5 text-slate-600 select-none border-r pr-4 font-mono">
                            <div>
                              {'01'}
                              <br />
                            </div>
                            <div>
                              {'02'}
                              <br />
                            </div>
                            <div>
                              {'03'}
                              <br />
                            </div>
                            <div>
                              {'04'}
                              <br />
                            </div>
                            <div>
                              {'05'}
                              <br />
                            </div>
                            <div>
                              {'06'}
                              <br />
                            </div>
                            <div>
                              {'07'}
                              <br />
                            </div>
                            <div>
                              {'08'}
                              <br />
                            </div>
                            <div>
                              {'09'}
                              <br />
                            </div>
                            <div>
                              {'10'}
                              <br />
                            </div>
                            <div>
                              {'11'}
                              <br />
                            </div>
                            <div>
                              {'12'}
                              <br />
                            </div>
                          </div>
                          <pre className="prism-code language-javascript" style={{ backgroundColor: 'transparent' }}>
                            <code className="px-4 font-mono whitespace-pre">
                              <div className="token-line">
                                <span className="token keyword module">import</span>
                                <span className="token plain"> </span>
                                <span className="token punctuation">{'{'}</span>
                                <span className="token plain"> defineContext</span>
                                <span className="token punctuation">}</span>
                                <span className="token plain"> </span>
                                <span className="token keyword module">from</span>
                                <span className="token plain"> </span>
                                <span className="token string">'@deessejs/functions'</span>
                                <span className="token punctuation">;</span>
                              </div>
                              <div className="token-line">
                                <span className="token plain" style={{ display: 'inline-block' }}>
                                  &nbsp;
                                </span>
                              </div>
                              <div className="token-line">
                                <span className="token keyword">const</span>
                                <span className="token plain"> </span>
                                <span className="token punctuation">{'{'}</span>
                                <span className="token plain"> t</span>
                                <span className="token punctuation">,</span>
                                <span className="token plain"> createAPI </span>
                                <span className="token punctuation">{'}'}</span>
                                <span className="token plain"> </span>
                                <span className="token operator">=</span>
                                <span className="token plain"> </span>
                                <span className="token function">defineContext</span>
                                <span className="token punctuation">{'<'}</span>
                                <span className="token punctuation">{'{'}</span>
                              </div>
                              <div className="token-line">
                                <span className="token plain">  userId</span>
                                <span className="token operator">:</span>
                                <span className="token plain"> </span>
                                <span className="token keyword">string</span>
                                <span className="token punctuation">;</span>
                              </div>
                              <div className="token-line">
                                <span className="token plain">  database</span>
                                <span className="token operator">:</span>
                                <span className="token plain"> Database</span>
                                <span className="token punctuation">;</span>
                              </div>
                              <div className="token-line">
                                <span className="token plain"></span>
                                <span className="token punctuation">{'}'}</span>
                                <span className="token operator">></span>
                                <span className="token punctuation">({'{'}</span>
                              </div>
                              <div className="token-line">
                                <span className="token plain">  userId</span>
                                <span className="token operator">:</span>
                                <span className="token plain"> </span>
                                <span className="token string">'user-123'</span>
                                <span className="token punctuation">,</span>
                              </div>
                              <div className="token-line">
                                <span className="token plain">  database</span>
                                <span className="token operator">:</span>
                                <span className="token plain"> myDatabase</span>
                                <span className="token punctuation">,</span>
                              </div>
                              <div className="token-line">
                                <span className="token plain"></span>
                                <span className="token punctuation">{'}'}</span>
                                <span className="token punctuation">)</span>
                                <span className="token punctuation">;</span>
                              </div>
                            </code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
