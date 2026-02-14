import React from 'react';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
    id: string;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Tab 內容面板 | Tab content panel — renders children only when the tab is active.
 *
 * @param index - 此面板對應的 tab 索引 | Tab index this panel belongs to
 * @param value - 當前選中的 tab 索引 | Currently selected tab index
 * @param id - 面板元素 id | Panel element id
 */
export function TabPanel(props: TabPanelProps) {
    const { children, value, index, id, className, style, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={id}
            aria-labelledby={`main-tab-${index}`}
            style={{
                height: value === index ? '100%' : 0,
                display: value === index ? 'flex' : 'none',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden',
                ...style
            }}
            className={className}
            {...other}
        >
            {value === index && children}
        </div>
    );
}
