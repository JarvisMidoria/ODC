import React from 'react';
import { createRoot } from 'react-dom/client';
import { Studio } from 'sanity';
import config from '../sanity.config.js';

createRoot(document.getElementById('sanity-root')).render(React.createElement(Studio, { config }));
