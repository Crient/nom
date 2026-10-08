# Future dwell-time verification — design notes only

The current web V1 checks a short burst of fresh location readings against the restaurant on the server. It does **not** measure time spent at the restaurant and never displays the Figma “17 minutes” claim. The map is display context, not evidence of elapsed presence. No location watch, background tracking, native geofence or duration-based reward rule was added.

A single location reading identifies a point and timestamp; it cannot establish continuous presence for the preceding 17 minutes. The browser API offers point readings and repeated updates, with user consent. [W3C Geolocation specification](https://www.w3.org/TR/geolocation/).

Possible later designs, requiring their own product/privacy review and implementation approval:

- **Repeated foreground readings:** measure a real time window while the app remains visibly active, with explicit consent, bounded sampling, acceptable accuracy and maximum gaps. Stop on navigation, cancellation or identity change. Missing/suspended intervals must not be credited as presence. Report observed sample coverage rather than inventing uninterrupted dwell.
- **Native geofencing:** use actual venue entry/exit events, supplemented by a fresh foreground reading and an explicit completion action. Delayed or missing events should lower confidence rather than generate a made-up duration.
- **Native background location:** only with separate explicit permission and a clear purpose, limited collection/retention, stop controls and a reviewed battery/privacy impact. It is not part of this web pass.

Any future duration claim would need a server-reviewed evidence policy, trusted timestamps, replay prevention and accurate communication of confidence. Changing duration-based eligibility would require a separate reward/schema review. Browser coordinates alone are not a guarantee of the device’s actual physical position; the specification explicitly describes that limitation. [W3C scope and introduction](https://www.w3.org/TR/geolocation/#introduction).
