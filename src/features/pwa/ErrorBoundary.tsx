import { Component, type ReactNode } from 'react'

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { crashed: boolean }
> {
  state = { crashed: false }
  static getDerivedStateFromError() {
    return { crashed: true }
  }
  render() {
    if (!this.state.crashed) return this.props.children
    return (
      <div className="center-page">
        <h2>Something went wrong</h2>
        <button className="primary" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    )
  }
}
