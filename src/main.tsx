import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createTheme, MantineProvider } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import '@mantine/spotlight/styles.css'
import './index.css'
import App from './App.tsx'

const theme = createTheme({
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  },
  primaryColor: 'gray',
  defaultRadius: 'md',
  components: {
    Spotlight: {
      styles: {
        action: {
          '&[data-selected]': {
            backgroundColor: 'var(--mantine-color-blue-filled)',
            color: 'var(--mantine-color-white)',
            '--action-description-color': 'var(--mantine-color-white)',
            '--action-description-opacity': '0.7',
          },
        },
      },
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="bottom-right" />
      <App />
    </MantineProvider>
  </StrictMode>,
)
