import { cn } from '../../utils/cn'

/**
 * The mobile frame every screen renders inside. Constrains content to the
 * 440px width used by the Figma designs and centres it on larger viewports.
 *
 * `topBar` and `bottomNav` are slots so each route can opt in or out.
 */
export default function AppShell({ topBar, bottomNav, children, className }) {
  return (
    <div className="min-h-dvh bg-background">
      <div data-chrome={import.meta.env.DEV ? 'preview' : 'web'} className="nom-app-shell mx-auto flex min-h-dvh w-full max-w-app flex-col bg-surface [container-type:inline-size]">
        {topBar}

        <main id="main-content" tabIndex={-1} className={cn('min-w-0 flex-1', bottomNav && 'pb-bottom-nav', className)}>
          {children}
        </main>

        {bottomNav}
      </div>
    </div>
  )
}
