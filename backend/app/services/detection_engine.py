from datetime import datetime, timedelta, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import SecurityEvent, DetectionRule, Alert, alert_events_table

DEFAULT_RULES = [
    {
        "rule_code": "RULE-BRUTE-01",
        "name": "Brute-Force Login Detection",
        "description": "Detects repeated failed login attempts from the same source IP or targeting the same account within a configured time window.",
        "rule_type": "brute_force",
        "default_severity": "high",
        "configuration": {
            "threshold": 5,
            "window_minutes": 10
        },
        "is_enabled": True
    },
    {
        "rule_code": "RULE-AUTH-02",
        "name": "Repeated Authentication Failures",
        "description": "Identifies high frequency of failed authentication events targeting an individual user identity across multiple sources.",
        "rule_type": "auth_failure",
        "default_severity": "medium",
        "configuration": {
            "threshold": 3,
            "window_minutes": 15
        },
        "is_enabled": True
    },
    {
        "rule_code": "RULE-PRIV-03",
        "name": "Suspicious Privilege Escalation",
        "description": "Flags log events where administrative privileges, sudo access, or root policies are attached to non-privileged accounts.",
        "rule_type": "privilege_change",
        "default_severity": "critical",
        "configuration": {
            "keywords": ["AdministratorAccess", "sudo", "role_modification", "root", "nopasswd", "AttachRolePolicy"]
        },
        "is_enabled": True
    },
    {
        "rule_code": "RULE-UNAUTH-04",
        "name": "Unauthorized Access Attempts",
        "description": "Identifies repetitive access-denied or 403 Forbidden events involving sensitive resources like databases, S3, or secrets.",
        "rule_type": "unauthorized_access",
        "default_severity": "high",
        "configuration": {
            "threshold": 3,
            "window_minutes": 15
        },
        "is_enabled": True
    },
    {
        "rule_code": "RULE-TAMPER-05",
        "name": "Unusual Administrative & Cloud Tampering Activity",
        "description": "Detects critical security control modifications such as disabling audit trails (StopLogging), disabling encryption, or opening security groups to 0.0.0.0/0.",
        "rule_type": "admin_tampering",
        "default_severity": "critical",
        "configuration": {
            "actions": ["StopLogging", "DeleteBucketEncryption", "AuthorizeSecurityGroupIngress", "DisableKey", "delete_trail"]
        },
        "is_enabled": True
    },
    {
        "rule_code": "RULE-OFFHOURS-06",
        "name": "Suspicious Off-Hours Administrative Activity",
        "description": "Flags administrative actions, SSH sessions, or root console logins occurring between 00:00 and 06:00 UTC.",
        "rule_type": "off_hours_anomaly",
        "default_severity": "medium",
        "configuration": {
            "start_hour": 0,
            "end_hour": 6
        },
        "is_enabled": True
    }
]

def ensure_default_rules(db: Session):
    """Seed initial detection rules if database is empty."""
    for rule_data in DEFAULT_RULES:
        existing = db.query(DetectionRule).filter(DetectionRule.rule_code == rule_data["rule_code"]).first()
        if not existing:
            new_rule = DetectionRule(**rule_data)
            db.add(new_rule)
    db.commit()

def _create_or_update_alert(
    db: Session,
    rule: DetectionRule,
    title: str,
    description: str,
    severity: str,
    affected_user: Optional[str],
    affected_ip: Optional[str],
    recommended_action: str,
    dedup_key: str,
    triggering_events: List[SecurityEvent]
) -> Alert:
    now = datetime.now(timezone.utc)
    
    # Check if an active alert for this deduplication key already exists
    active_alert = db.query(Alert).filter(
        Alert.dedup_key == dedup_key,
        Alert.status.in_(["new", "acknowledged", "investigating"])
    ).first()

    if active_alert:
        active_alert.occurrence_count += len(triggering_events)
        active_alert.last_seen = now
        active_alert.updated_at = now
        # Link new events
        for evt in triggering_events:
            if evt not in active_alert.events:
                active_alert.events.append(evt)
        db.commit()
        db.refresh(active_alert)
        return active_alert

    # Create new alert
    new_alert = Alert(
        rule_id=rule.id,
        title=title,
        description=description,
        severity=severity,
        status="new",
        first_seen=now,
        last_seen=now,
        occurrence_count=len(triggering_events),
        affected_user=affected_user,
        affected_ip=affected_ip,
        recommended_action=recommended_action,
        dedup_key=dedup_key,
        created_at=now,
        updated_at=now
    )
    db.add(new_alert)
    db.flush()

    for evt in triggering_events:
        new_alert.events.append(evt)

    db.commit()
    db.refresh(new_alert)
    return new_alert

def evaluate_events(db: Session, new_events: List[SecurityEvent]) -> List[Alert]:
    """
    Evaluates new incoming events against enabled detection rules.
    Returns list of generated or updated Alerts.
    """
    if not new_events:
        return []

    ensure_default_rules(db)
    rules = db.query(DetectionRule).filter(DetectionRule.is_enabled == True).all()
    rule_map = {r.rule_type: r for r in rules}
    generated_alerts = []

    for event in new_events:
        evt_time = event.event_timestamp
        if evt_time.tzinfo is None:
            evt_time = evt_time.replace(tzinfo=timezone.utc)

        # -------------------------------------------------------------
        # Rule 1: Brute-Force Login Detection (by IP or username)
        # -------------------------------------------------------------
        rule_brute = rule_map.get("brute_force")
        if rule_brute and event.event_type.lower() in ["login", "login_attempt"] and event.status.lower() in ["failed", "denied"]:
            window_minutes = rule_brute.configuration.get("window_minutes", 10)
            threshold = rule_brute.configuration.get("threshold", 5)
            since = evt_time - timedelta(minutes=window_minutes)

            # Check by IP
            if event.source_ip:
                count_ip = db.query(SecurityEvent).filter(
                    SecurityEvent.source_ip == event.source_ip,
                    SecurityEvent.event_type.in_(["login", "login_attempt"]),
                    SecurityEvent.status.in_(["failed", "denied"]),
                    SecurityEvent.event_timestamp >= since
                ).count()

                if count_ip >= threshold:
                    matched_evts = db.query(SecurityEvent).filter(
                        SecurityEvent.source_ip == event.source_ip,
                        SecurityEvent.event_type.in_(["login", "login_attempt"]),
                        SecurityEvent.status.in_(["failed", "denied"]),
                        SecurityEvent.event_timestamp >= since
                    ).all()

                    alert = _create_or_update_alert(
                        db=db,
                        rule=rule_brute,
                        title=f"Potential Brute-Force Attack from {event.source_ip}",
                        description=f"{count_ip} consecutive failed login attempts detected from IP {event.source_ip} within {window_minutes} minutes.",
                        severity=rule_brute.default_severity,
                        affected_user=event.username,
                        affected_ip=event.source_ip,
                        recommended_action="Inspect source IP geographic location, review firewall rules, consider temporary IP throttling or MFA enforcement.",
                        dedup_key=f"BRUTE_IP_{event.source_ip}",
                        triggering_events=matched_evts
                    )
                    event.detection_status = "flagged"
                    if alert not in generated_alerts:
                        generated_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 2: Repeated Authentication Failures (by Account)
        # -------------------------------------------------------------
        rule_auth = rule_map.get("auth_failure")
        if rule_auth and event.username and event.event_type.lower() in ["login", "login_attempt"] and event.status.lower() in ["failed", "denied"]:
            window_minutes = rule_auth.configuration.get("window_minutes", 15)
            threshold = rule_auth.configuration.get("threshold", 3)
            since = evt_time - timedelta(minutes=window_minutes)

            count_user = db.query(SecurityEvent).filter(
                SecurityEvent.username == event.username,
                SecurityEvent.event_type.in_(["login", "login_attempt"]),
                SecurityEvent.status.in_(["failed", "denied"]),
                SecurityEvent.event_timestamp >= since
            ).count()

            if count_user >= threshold:
                matched_evts = db.query(SecurityEvent).filter(
                    SecurityEvent.username == event.username,
                    SecurityEvent.event_type.in_(["login", "login_attempt"]),
                    SecurityEvent.status.in_(["failed", "denied"]),
                    SecurityEvent.event_timestamp >= since
                ).all()

                alert = _create_or_update_alert(
                    db=db,
                    rule=rule_auth,
                    title=f"Multiple Authentication Failures for {event.username}",
                    description=f"{count_user} failed logins observed for user account '{event.username}' within {window_minutes} minutes.",
                    severity=rule_auth.default_severity,
                    affected_user=event.username,
                    affected_ip=event.source_ip,
                    recommended_action="Verify if user forgot credentials, review subsequent successful logins from other IPs, and initiate user contact.",
                    dedup_key=f"AUTH_USER_{event.username}",
                    triggering_events=matched_evts
                )
                event.detection_status = "flagged"
                if alert not in generated_alerts:
                    generated_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 3: Suspicious Privilege Escalation
        # -------------------------------------------------------------
        rule_priv = rule_map.get("privilege_change")
        if rule_priv:
            keywords = [k.lower() for k in rule_priv.configuration.get("keywords", ["administratoraccess", "sudo", "root"])]
            raw_text = f"{event.event_type} {event.action} {event.resource} {event.raw_log or ''}".lower()
            if any(k in raw_text for k in keywords):
                alert = _create_or_update_alert(
                    db=db,
                    rule=rule_priv,
                    title=f"Suspicious Privilege Escalation Detected for {event.username or 'Unknown'}",
                    description=f"Privilege modification detected: action '{event.action or event.event_type}' on resource '{event.resource or 'N/A'}' by actor '{event.username or 'Unknown'}'.",
                    severity=rule_priv.default_severity,
                    affected_user=event.username,
                    affected_ip=event.source_ip,
                    recommended_action="Verify authorization ticket for privilege elevation. Check identity governance and revoke excessive cloud permissions if unauthorized.",
                    dedup_key=f"PRIV_{event.username or 'UNK'}_{event.resource or 'RES'}",
                    triggering_events=[event]
                )
                event.detection_status = "flagged"
                if alert not in generated_alerts:
                    generated_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 4: Unauthorized Access Attempts to Restricted Resources
        # -------------------------------------------------------------
        rule_unauth = rule_map.get("unauthorized_access")
        if rule_unauth and (event.status.lower() in ["failed", "denied"] or "forbidden" in (event.raw_log or "").lower() or "accessdenied" in (event.raw_log or "").lower()):
            window_minutes = rule_unauth.configuration.get("window_minutes", 15)
            threshold = rule_unauth.configuration.get("threshold", 3)
            since = evt_time - timedelta(minutes=window_minutes)

            # Check frequency for this user or IP targeting sensitive resources
            count_unauth = db.query(SecurityEvent).filter(
                SecurityEvent.status.in_(["failed", "denied"]),
                SecurityEvent.source_ip == event.source_ip,
                SecurityEvent.event_timestamp >= since
            ).count()

            if count_unauth >= threshold:
                matched_evts = db.query(SecurityEvent).filter(
                    SecurityEvent.status.in_(["failed", "denied"]),
                    SecurityEvent.source_ip == event.source_ip,
                    SecurityEvent.event_timestamp >= since
                ).all()

                alert = _create_or_update_alert(
                    db=db,
                    rule=rule_unauth,
                    title=f"Repetitive Unauthorized Access Denials from {event.source_ip or event.username}",
                    description=f"{count_unauth} access denied events observed from IP {event.source_ip} targeting protected cloud resources within {window_minutes} minutes.",
                    severity=rule_unauth.default_severity,
                    affected_user=event.username,
                    affected_ip=event.source_ip,
                    recommended_action="Check whether internal credentials were leaked. Inspect permission policies and investigate potential lateral reconnaissance.",
                    dedup_key=f"UNAUTH_{event.source_ip or event.username}",
                    triggering_events=matched_evts
                )
                event.detection_status = "flagged"
                if alert not in generated_alerts:
                    generated_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 5: Unusual Administrative & Cloud Tampering Activity
        # -------------------------------------------------------------
        rule_tamper = rule_map.get("admin_tampering")
        if rule_tamper:
            tamper_actions = [a.lower() for a in rule_tamper.configuration.get("actions", ["stoplogging", "deletebucketencryption", "authorizesecuritygroupingress"])]
            action_lower = (event.action or event.event_type or "").lower()
            raw_lower = (event.raw_log or "").lower()
            if any(ta in action_lower or ta in raw_lower for ta in tamper_actions) or "0.0.0.0/0" in raw_lower:
                alert = _create_or_update_alert(
                    db=db,
                    rule=rule_tamper,
                    title=f"CRITICAL: Cloud Audit or Security Control Tampering ({event.action or event.event_type})",
                    description=f"High-impact administrative tampering detected: '{event.action or event.event_type}' executed on '{event.resource or 'N/A'}' by '{event.username or 'Unknown'}'.",
                    severity=rule_tamper.default_severity,
                    affected_user=event.username,
                    affected_ip=event.source_ip,
                    recommended_action="IMMEDIATE ACTION: Re-enable audit logging/encryption. Review CloudTrail and IAM session credentials for compromise.",
                    dedup_key=f"TAMPER_{event.resource or 'N_A'}_{event.action or 'ACT'}",
                    triggering_events=[event]
                )
                event.detection_status = "flagged"
                if alert not in generated_alerts:
                    generated_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 6: Off-Hours Activity / Anomalous Schedule
        # -------------------------------------------------------------
        rule_offhours = rule_map.get("off_hours_anomaly")
        if rule_offhours:
            hour = evt_time.hour
            start_hour = rule_offhours.configuration.get("start_hour", 0)
            end_hour = rule_offhours.configuration.get("end_hour", 6)
            is_off_hour = (start_hour <= hour < end_hour)
            
            # Check if this is an administrative or SSH session during off-hours
            if is_off_hour and event.event_type.lower() in ["unusual_activity", "ssh_login", "role_modification", "security_tampering"]:
                alert = _create_or_update_alert(
                    db=db,
                    rule=rule_offhours,
                    title=f"Off-Hours Sensitive Administrative Access by {event.username or 'Unknown'}",
                    description=f"Administrative session '{event.action or event.event_type}' logged at {evt_time.strftime('%H:%M:%S UTC')} outside regular business hours (06:00-22:00 UTC).",
                    severity=rule_offhours.default_severity,
                    affected_user=event.username,
                    affected_ip=event.source_ip,
                    recommended_action="Correlate with authorized change management ticket. Validate user identity and verify remote IP authenticity.",
                    dedup_key=f"OFFHOURS_{event.username or 'UNK'}_{evt_time.date()}",
                    triggering_events=[event]
                )
                event.detection_status = "flagged"
                if alert not in generated_alerts:
                    generated_alerts.append(alert)

    db.commit()
    return generated_alerts
