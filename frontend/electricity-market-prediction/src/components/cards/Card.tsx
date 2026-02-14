 'use client';
 
 import React from 'react';
 import { Paper, PaperProps } from '@mui/material';
 
 export interface CardProps extends PaperProps {
   interactive?: boolean;
 }
 
 /**
  * Card - unified container style for dashboard panels/cards.
  * Uses CSS variables from `app/globals.css` to stay consistent with the design system.
  */
 export const Card: React.FC<CardProps> = ({ interactive = false, sx, ...props }) => {
   return (
     <Paper
       elevation={0}
       variant="outlined"
       sx={{
         p: 3,
         borderRadius: 2,
         border: '1px solid var(--card-border)',
         backgroundColor: 'var(--card-bg)',
         backgroundImage: 'none',
         backdropFilter: 'blur(12px)',
         transition: 'all 0.25s ease',
         ...(interactive
           ? {
               cursor: 'pointer',
               '&:hover': {
                 transform: 'translateY(-3px)',
                 borderColor: 'var(--primary)',
               },
             }
           : {}),
         ...sx,
       }}
       {...props}
     />
   );
 };
 
 export default Card;

