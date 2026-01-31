import React, { useState } from 'react'

const CollapsibleSection = ({ title, children, defaultCollapsed = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed)
  }

  return (
    <div className={`collapsible-section ${isCollapsed ? 'collapsed' : 'expanded'}`}>
      <div className="collapsible-header" onClick={toggleCollapse}>
        <h2>
          <span className="emoji-icon">{title.split(' ')[0]}</span>
          {' '}{title.split(' ').slice(1).join(' ')}
        </h2>
        <div className="collapse-controls">
          <button className="collapse-toggle">
            {isCollapsed ? '▶' : '▼'}
          </button>
        </div>
      </div>
      
      {!isCollapsed && (
        <div className="collapsible-content">
          {children}
        </div>
      )}
    </div>
  )
}

export default CollapsibleSection
