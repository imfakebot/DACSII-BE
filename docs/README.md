# Documentation - Soccer Field Booking System

This directory contains various diagrams documenting the architecture, design, and processes of the Soccer Field Booking System.

## Diagram List

Below is a list of all PlantUML (`.puml`) diagram source files available in this directory:

*   `Activity-Payment-Process.puml` - Activity Diagram for Payment Process Flow
*   `Activity-User-Registration.puml` - Activity Diagram for User Registration Flow
*   `Class-diagram.puml` - Detailed Class Diagram
*   `Communication-Create-Booking.puml` - Communication Diagram for Create Booking Flow
*   `Component-diagram.puml` - High-level Component Diagram
*   `database-erd.puml` - Database Entity-Relationship Diagram (ERD)
*   `Deployment-diagram.puml` - System Deployment Diagram
*   `DFD-Level0-Overview.puml` - Data Flow Diagram (Level 0) for System Overview
*   `Interaction-Overview-Booking-Process.puml` - Interaction Overview Diagram for Booking Process
*   `Object-Sample-Booking.puml` - Object Diagram for a Sample Booking
*   `Package-Module-Dependencies.puml` - Package Diagram for Module Dependencies
*   `Sequence-diagram-cancel-booking.puml` - Sequence Diagram for "Cancel Booking"
*   `Sequence-diagram-create-booking.puml` - Sequence Diagram for "Create Booking"
*   `State-Booking-Lifecycle.puml` - State Machine Diagram for Booking Status Lifecycle
*   `Timing-Simple-Request.puml` - Timing Diagram for a Simple Request
*   `Use-case-diagram.puml` - System Use Case Diagram

## How to View/Generate Diagrams

These diagrams are written in PlantUML, a simple text-based language for drawing UML diagrams. To view or generate image files (SVG, PNG) from these `.puml` files, you can use one of the following methods:

1.  **PlantUML Online Server:**
    *   Go to [http://www.plantuml.com/plantuml/](http://www.plantuml.com/plantuml/)
    *   Copy the content of any `.puml` file and paste it into the editor.
    *   The diagram will be rendered automatically.

2.  **PlantUML JAR (Command Line):**
    *   Download the `plantuml.jar` file from the official PlantUML website ([https://plantuml.com/download](https://plantuml.com/download)).
    *   Make sure you have Java installed.
    *   Navigate to this `docs` directory in your terminal.
    *   Run the following command to generate PNG images for all `.puml` files:
        ```bash
        java -jar /path/to/plantuml.jar *.puml
        ```
    *   Or for a specific file:
        ```bash
        java -jar /path/to/plantuml.jar Class-diagram.puml
        ```
    *   To generate SVG files, use the `-tsvg` option:
        ```bash
        java -jar /path/to/plantuml.jar -tsvg *.puml
        ```

3.  **VS Code Extension:**
    *   Install the "PlantUML" extension (by jygui) in VS Code.
    *   Open any `.puml` file in VS Code.
    *   Use `Alt + D` (or right-click and select "Preview Current Diagram") to see the diagram.
    *   You can also export the diagram to various formats by right-clicking on the preview.

---

_This documentation helps understand the system's structure and behavior._
