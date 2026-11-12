import React from 'react';
import {createRoot} from 'react-dom/client';
import {App} from './App';
import {readIntegrationConfig} from './integration';
import './style.css';
const config=readIntegrationConfig(import.meta.env);
createRoot(document.getElementById('root')!).render(<React.StrictMode>{config.mode==='invalid'?<main><h1>Read-only configuration unavailable</h1><p role="alert">{config.message}</p><p>No network requests were made. Correct local configuration and rebuild.</p></main>:<App integration={config.mode==='read-only'?{config:config.config}:undefined}/>}</React.StrictMode>);
