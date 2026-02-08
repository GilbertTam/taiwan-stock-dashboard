import React from 'react';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
    id: string;
    className?: string;
    style?: React.CSSProperties;
}

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
