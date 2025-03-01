``` sql
CREATE TABLE DataSource2 (
    Final_Charge_ID varchar(255) NULL, -- Specify a length for varchar columns
    Patient_ID varchar(255) NULL,
    Service_Date date NULL,
    Posting_Date date NULL,
    DOS_Period varchar(255) NULL,
    Posting_Period varchar(255) NULL,
    Location_Group varchar(255) NULL,
    Location_Group_Final varchar(255) NULL,
    Primary_Insurance_Group varchar(255) NULL,
    Primary_Insurance_Group_Final varchar(255) NULL,
    Procedure_Group varchar(255) NULL,
    Procedure_Group_Final varchar(255) NULL,
    Provider_Group varchar(255) NULL,
    Provider_Group_Final varchar(255) NULL,
    Charge_Amount float NULL,
    Payment_Amount float NULL,
    Unit varchar(1) NULL, -- Assuming Unit is a single character (e.g., '1', '2')
    Trans_Type varchar(1) NULL, -- Assuming Trans_Type is a single character (e.g., 'P', 'C')
    Final_Charge_Count int NULL,
    Final_Charge_Count_w_Payment int NULL,
    Final_Visit_Count int NULL,
    Final_Visit_Count_w_Payment int NULL,
    Location varchar(255) NULL,
    Insurance varchar(255) NULL,
    "Procedure" varchar(255) NULL, -- Quoted as requested
    "Provider" varchar(255) NULL, -- Quoted as requested
    Final_Visit_ID varchar(255) NULL
);
```

``` sql
DECLARE @i INT = 1;
WHILE @i <= 300
BEGIN
    INSERT INTO DataSource2 (
        Final_Charge_ID, Patient_ID, Service_Date, Posting_Date, Posting_Period, 
        Location_Group, Location_Group_Final, Primary_Insurance_Group, 
        Primary_Insurance_Group_Final, Procedure_Group, Procedure_Group_Final, 
        Provider_Group, Provider_Group_Final, Charge_Amount, Payment_Amount, 
        Unit, Trans_Type, Final_Charge_Count, Final_Charge_Count_w_Payment, 
        Final_Visit_Count, Final_Visit_Count_w_Payment, Location, Insurance, 
        "Procedure", "Provider", Final_Visit_ID -- Added Final_Visit_ID
    )
    VALUES (
        CONCAT('CHG', @i), -- Final_Charge_ID as a unique varchar (fits varchar(255))
        CONCAT('PAT', 1000 + @i), -- Patient_ID as a unique varchar (fits varchar(255))
        DATEADD(day, -FLOOR(RAND() * 365), '2024-12-31'), -- Service_Date (past year, fits date)
        DATEADD(day, -FLOOR(RAND() * 30), '2025-02-23'), -- Posting_Date (past month, fits date)
        CONCAT(YEAR(DATEADD(day, -FLOOR(RAND() * 30), '2025-02-23')), '-Q', FLOOR(RAND() * 4 + 1)), -- Posting_Period (e.g., 2025-Q1, fits varchar(255))
        -- Location_Group and Location_Group_Final (e.g., LocA1 -> LocA)
        CONCAT('Loc', 
               CASE 
                   WHEN @i % 3 = 0 THEN 'C' 
                   WHEN @i % 2 = 0 THEN 'B' 
                   ELSE 'A' 
               END, 
               CASE 
                   WHEN @i % 5 = 0 THEN '1' 
                   WHEN @i % 4 = 0 THEN '2' 
                   WHEN @i % 3 = 0 THEN 'a' 
                   ELSE 'b' 
               END), -- Fits varchar(255)
        CONCAT('Loc', 
               CASE 
                   WHEN @i % 3 = 0 THEN 'C' 
                   WHEN @i % 2 = 0 THEN 'B' 
                   ELSE 'A' 
               END), -- Fits varchar(255)
        -- Primary_Insurance_Group and Primary_Insurance_Group_Final (e.g., InsurerX1 -> InsurerX)
        CONCAT('Insurer', 
               CASE 
                   WHEN @i % 3 = 0 THEN 'Z' 
                   WHEN @i % 2 = 0 THEN 'Y' 
                   ELSE 'X' 
               END, 
               CASE 
                   WHEN @i % 5 = 0 THEN '1' 
                   WHEN @i % 4 = 0 THEN '2' 
                   WHEN @i % 3 = 0 THEN 'a' 
                   ELSE 'b' 
               END), -- Fits varchar(255)
        CONCAT('Insurer', 
               CASE 
                   WHEN @i % 3 = 0 THEN 'Z' 
                   WHEN @i % 2 = 0 THEN 'Y' 
                   ELSE 'X' 
               END), -- Fits varchar(255)
        -- Procedure_Group and Procedure_Group_Final (e.g., Surgery1 -> Surgery)
        CONCAT(
               CASE 
                   WHEN @i % 3 = 0 THEN 'Therapy' 
                   WHEN @i % 2 = 0 THEN 'Consultation' 
                   ELSE 'Surgery' 
               END, 
               CASE 
                   WHEN @i % 5 = 0 THEN '1' 
                   WHEN @i % 4 = 0 THEN '2' 
                   WHEN @i % 3 = 0 THEN 'a' 
                   ELSE 'b' 
               END), -- Fits varchar(255)
        CASE 
            WHEN @i % 3 = 0 THEN 'Therapy' 
            WHEN @i % 2 = 0 THEN 'Consultation' 
            ELSE 'Surgery' 
        END, -- Fits varchar(255)
        -- Provider_Group and Provider_Group_Final (e.g., ProviderA1 -> ProviderA)
        CONCAT('Provider', 
               CASE 
                   WHEN @i % 3 = 0 THEN 'C' 
                   WHEN @i % 2 = 0 THEN 'B' 
                   ELSE 'A' 
               END, 
               CASE 
                   WHEN @i % 5 = 0 THEN '1' 
                   WHEN @i % 4 = 0 THEN '2' 
                   WHEN @i % 3 = 0 THEN 'a' 
                   ELSE 'b' 
               END), -- Fits varchar(255)
        CONCAT('Provider', 
               CASE 
                   WHEN @i % 3 = 0 THEN 'C' 
                   WHEN @i % 2 = 0 THEN 'B' 
                   ELSE 'A' 
               END), -- Fits varchar(255)
        CAST(RAND() * 4000 + 1000 AS float), -- Charge_Amount (e.g., $1,000–$5,000, fits float)
        CAST(RAND() * 3500 + 500 AS float), -- Payment_Amount (e.g., $500–$4,000, fits float)
        CASE WHEN @i % 2 = 0 THEN '1' ELSE '2' END, -- Unit (simple 1 or 2 for variety, fits varchar(1))
        CASE WHEN @i % 2 = 0 THEN 'P' ELSE 'C' END, -- Trans_Type (P for payment, C for charge, fits varchar(1))
        FLOOR(RAND() * 5 + 1), -- Final_Charge_Count (1–5, fits int)
        FLOOR(RAND() * 4 + 1), -- Final_Charge_Count_w_Payment (1–4, fits int)
        FLOOR(RAND() * 3 + 1), -- Final_Visit_Count (1–3, fits int)
        FLOOR(RAND() * 2 + 1), -- Final_Visit_Count_w_Payment (1–2, fits int)
        CONCAT('Location_', 
               CASE 
                   WHEN @i % 3 = 0 THEN 'C' 
                   WHEN @i % 2 = 0 THEN 'B' 
                   ELSE 'A' 
               END), -- Location (fits varchar(255))
        CONCAT('Insurer_', 
               CASE 
                   WHEN @i % 3 = 0 THEN 'Z_Detail' 
                   WHEN @i % 2 = 0 THEN 'Y_Detail' 
                   ELSE 'X_Detail' 
               END), -- Insurance (fits varchar(255))
        CONCAT(
               CASE 
                   WHEN @i % 3 = 0 THEN 'Therapy_' 
                   WHEN @i % 2 = 0 THEN 'Consultation_' 
                   ELSE 'Surgery_' 
               END, 
               'Detail'), -- Procedure (fits varchar(255))
        CONCAT('Provider_', 
               CASE 
                   WHEN @i % 3 = 0 THEN 'C_Detail' 
                   WHEN @i % 2 = 0 THEN 'B_Detail' 
                   ELSE 'A_Detail' 
               END), -- Provider (fits varchar(255))
        CONCAT('VIS', @i) -- Final_Visit_ID as a unique varchar (e.g., VIS1, VIS2, fits varchar(255))
    );
    SET @i = @i + 1;
END;
```